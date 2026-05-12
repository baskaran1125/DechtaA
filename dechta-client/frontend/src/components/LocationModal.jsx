import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Crosshair, MapPin, Clock, ArrowLeft, Navigation, Loader2 } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { searchLocations, reverseGeocode, getMapsKey } from '../api/apiClient';

// ── Google Maps JS API loader (singleton) ────────────────────
let mapsApiPromise = null;
let mapsApiKey = null;

function loadGoogleMapsApi(apiKey) {
    if (mapsApiPromise) return mapsApiPromise;
    if (!apiKey) return Promise.resolve(null);
    mapsApiKey = apiKey;

    mapsApiPromise = new Promise((resolve, reject) => {
        if (window.google?.maps?.Map) {
            resolve(window.google.maps);
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google?.maps || null);
        script.onerror = () => {
            mapsApiPromise = null;
            reject(new Error('Failed to load Google Maps'));
        };
        document.head.appendChild(script);
    });

    return mapsApiPromise;
}

export default function LocationModal() {
    const { locationModalOpen, setLocationModalOpen, setDeliveryAddress } = useLocation();

    // ── View toggle state ─────────────────────────────────────
    const [isMapViewVisible, setIsMapViewVisible] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoAddress, setGeoAddress] = useState('Fetching precise location...');
    const [geoData, setGeoData] = useState({ area: '', city: '', state: '', zip: '', lat: null, lng: null });
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mapsReady, setMapsReady] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const focusTimerRef = useRef(null);
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ── Load Google Maps API key from backend ────────────────
    useEffect(() => {
        getMapsKey()
            .then(res => {
                if (res.success && res.data?.key) {
                    loadGoogleMapsApi(res.data.key)
                        .then(maps => {
                            if (maps) setMapsReady(true);
                        })
                        .catch(() => console.warn('[Maps] Failed to load Google Maps API'));
                }
            })
            .catch(() => console.warn('[Maps] Could not fetch maps key'));
    }, []);

    // Animate in/out + reset
    useEffect(() => {
        if (locationModalOpen) {
            requestAnimationFrame(() => setIsVisible(true));
            document.body.style.overflow = 'hidden';
            if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
            focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 350);
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        };
    }, [locationModalOpen]);

    // Reset when closed
    useEffect(() => {
        if (locationModalOpen) {
            setSearchQuery('');
            setSuggestions([]);
            setIsMapViewVisible(false);
            setGeoLoading(false);
            setGeoAddress('Fetching precise location...');
            setGeoData({ area: '', city: '', state: '', zip: '', lat: null, lng: null });
        }
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [locationModalOpen]);

    // ── Initialize or update Google Map when map view opens ──
    useEffect(() => {
        if (!isMapViewVisible || !mapsReady || !mapContainerRef.current) return;
        if (!window.google?.maps) return;

        const lat = geoData.lat || 13.0827;
        const lng = geoData.lng || 80.2707;

        if (!mapInstanceRef.current) {
            // Create map
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat, lng },
                zoom: 16,
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.google.maps.ControlPosition.RIGHT_CENTER,
                },
                styles: [
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ],
                gestureHandling: 'greedy',
            });

            mapInstanceRef.current = map;

            // Listen for map idle (after drag/zoom) to update address
            map.addListener('idle', () => {
                const center = map.getCenter();
                if (center) {
                    reverseGeocodePosition(center.lat(), center.lng());
                }
            });
        } else {
            // Just pan to new position
            mapInstanceRef.current.panTo({ lat, lng });
        }

        return () => {
            // Cleanup not needed — map persists
        };
    }, [isMapViewVisible, mapsReady]);

    // Clean up map instance when modal closes
    useEffect(() => {
        if (!locationModalOpen) {
            mapInstanceRef.current = null;
            markerRef.current = null;
        }
    }, [locationModalOpen]);

    const close = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => {
            setLocationModalOpen(false);
        }, 300);
    }, [setLocationModalOpen]);

    // ── Reverse geocode a position via backend ───────────────
    const reverseGeocodePosition = useCallback(async (lat, lng) => {
        setGeoData(prev => ({ ...prev, lat, lng }));
        try {
            const res = await reverseGeocode(lat, lng);
            if (res.success && res.data) {
                const d = res.data;
                const display = [d.area, d.city, d.state].filter(Boolean).join(', ');
                setGeoAddress(display || d.formatted || 'Location detected');
                setGeoData({ area: d.area, city: d.city, state: d.state, zip: d.zip, lat, lng });
            } else {
                setGeoAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
        } catch (err) {
            console.warn('[Location] Reverse geocode failed:', err.message);
            setGeoAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
    }, []);

    // ── Search via backend proxy (debounced) ──────────────────
    const handleSearchChange = (e) => {
        const q = e.target.value;
        setSearchQuery(q);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!q.trim()) {
            setSuggestions([]);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await searchLocations(q.trim());
                if (res.success && Array.isArray(res.data)) {
                    setSuggestions(res.data);
                }
            } catch (err) {
                console.warn('[Location] Search failed:', err.message);
                setSuggestions([]);
            }
            setSearchLoading(false);
        }, 350);
    };

    // ── Select an address from search ─────────────────────────
    const handleSelectAddress = (addr) => {
        setDeliveryAddress({
            label: addr.title,
            street: addr.title,
            city: addr.subtitle?.split(',')[1]?.trim() || '',
            state: addr.subtitle?.split(',')[2]?.trim() || '',
            zip: '',
            instructions: '',
            lat: null,
            lng: null,
        });
        close();
    };

    // ── GPS → transition to Map View ─────────────────────────
    const handleGetCurrentLocation = () => {
        setIsMapViewVisible(true);
        fetchGPSLocation();
    };

    // ── GPS fetch via backend reverse-geocode proxy ──────────
    const fetchGPSLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoAddress('Geolocation not supported');
            return;
        }
        setGeoLoading(true);
        setGeoAddress('Fetching precise location...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Pan map to GPS position
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
                    mapInstanceRef.current.setZoom(17);
                }

                setGeoData(prev => ({ ...prev, lat: latitude, lng: longitude }));

                try {
                    const res = await reverseGeocode(latitude, longitude);
                    if (res.success && res.data) {
                        const d = res.data;
                        const display = [d.area, d.city, d.state].filter(Boolean).join(', ');
                        setGeoAddress(display || d.formatted || 'Location detected');
                        setGeoData({ area: d.area, city: d.city, state: d.state, zip: d.zip, lat: latitude, lng: longitude });
                    } else {
                        setGeoAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        setGeoData({ area: '', city: '', state: '', zip: '', lat: latitude, lng: longitude });
                    }
                } catch (err) {
                    console.warn('[Location] Reverse geocode failed:', err.message);
                    setGeoAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    setGeoData({ area: '', city: '', state: '', zip: '', lat: latitude, lng: longitude });
                }
                setGeoLoading(false);
            },
            (err) => {
                setGeoLoading(false);
                if (err?.code === 1) {
                    setGeoAddress('Location permission denied');
                } else {
                    setGeoAddress('Unable to detect location');
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    // ── Confirm location from Map View ───────────────────────
    const handleConfirmLocation = () => {
        setDeliveryAddress({
            label: geoAddress,
            street: geoData.area || '',
            city: geoData.city || '',
            state: geoData.state || '',
            zip: geoData.zip || '',
            instructions: '',
            lat: geoData.lat,
            lng: geoData.lng,
        });
        close();
    };

    if (!locationModalOpen) return null;

    // ══════════════════════════════════════════════════════════
    //  VIEW 1: Search Drawer Content
    // ══════════════════════════════════════════════════════════
    const searchView = (
        <div className="flex flex-col h-full">
            {/* Close */}
            <div className="shrink-0 px-5 pt-5 pb-2">
                <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close">
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Search */}
            <div className="shrink-0 px-5 pb-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search for area, street name..."
                        aria-label="Search for delivery location"
                        className="w-full h-14 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-12 pr-4 text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                    {searchLoading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                </div>
            </div>

            {/* Get current location → goes to Map View */}
            <div className="shrink-0 px-5 pb-2">
                <button
                    onClick={handleGetCurrentLocation}
                    className="w-full flex items-center gap-3.5 py-4 px-1 group"
                    aria-label="Get current location using GPS"
                >
                    <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center shrink-0 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 transition-colors">
                        <Crosshair className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[15px] font-bold text-cyan-600">Get current location</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Using GPS</p>
                    </div>
                </button>
                <div className="border-b border-gray-100 dark:border-slate-800" />
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
                {suggestions.length > 0 && (
                    <div className="pt-3">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Search Results</p>
                        {suggestions.map(addr => (
                            <button
                                key={addr.place_id}
                                onClick={() => handleSelectAddress(addr)}
                                className="w-full flex items-start gap-3.5 py-3.5 px-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-gray-800 dark:text-gray-200 truncate">{addr.title}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 line-clamp-2">{addr.subtitle}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {suggestions.length === 0 && searchQuery.length === 0 && !searchLoading && (
                    <div className="pt-8 text-center">
                        <Clock className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-xs text-gray-300 dark:text-gray-600 font-medium">Type to search for your area or street</p>
                    </div>
                )}
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════
    //  VIEW 2: Map Pin View
    // ══════════════════════════════════════════════════════════
    const mapView = (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            {/* Top bar with back + search */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 z-10">
                <button
                    onClick={() => setIsMapViewVisible(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    aria-label="Back to search"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search an area or address"
                        className="w-full h-10 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-10 pr-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-slate-500 transition-colors"
                        readOnly
                        onClick={() => setIsMapViewVisible(false)}
                    />
                </div>
            </div>

            {/* Map area */}
            <div className="flex-1 relative overflow-hidden min-h-[220px]">
                {/* Real Google Map container */}
                {mapsReady ? (
                    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                ) : (
                    /* Fallback map placeholder when API key not set */
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
                        {/* Grid pattern */}
                        <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]" style={{
                            backgroundImage: `
                                linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px),
                                linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
                            `,
                            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
                        }} />
                        {/* Fake roads */}
                        <div className="absolute top-1/3 left-0 right-0 h-[3px] bg-gray-300/50 dark:bg-slate-600/30" />
                        <div className="absolute top-0 bottom-0 left-1/4 w-[3px] bg-gray-300/50 dark:bg-slate-600/30" />
                        <div className="absolute top-0 bottom-0 right-1/3 w-[2px] bg-gray-300/40 dark:bg-slate-600/20" />
                        <div className="absolute bottom-1/4 left-0 right-0 h-[2px] bg-gray-300/40 dark:bg-slate-600/20" />
                    </div>
                )}

                {/* Center pin overlay (always on top of map) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center pointer-events-none">
                    <div className="absolute bottom-[-4px] w-4 h-2 bg-black/15 rounded-full blur-[2px]" />
                    <div className="relative">
                        <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z" fill="#0891b2" />
                            <circle cx="20" cy="20" r="8" fill="white" />
                            <circle cx="20" cy="20" r="4" fill="#0891b2" />
                        </svg>
                    </div>
                </div>
                {!mapsReady && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cyan-500/20 animate-ping z-0" />
                )}

                {/* GPS Recenter FAB */}
                <button
                    onClick={fetchGPSLocation}
                    disabled={geoLoading}
                    className="absolute bottom-5 right-5 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow z-10 border border-gray-100 dark:border-slate-700 disabled:opacity-50"
                    aria-label="Locate me"
                >
                    {geoLoading ? (
                        <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
                    ) : (
                        <Navigation className="w-5 h-5 text-cyan-600" />
                    )}
                </button>

                {/* "Current location" pill */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-full shadow-md px-4 py-2 flex items-center gap-2 border border-gray-100 dark:border-slate-700 z-10">
                    <Crosshair className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Current location</span>
                </div>
            </div>

            {/* Bottom card */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 rounded-t-2xl -mt-4 relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="px-5 pt-5 pb-2">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Place the pin at exact delivery location</p>
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <MapPin className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-black text-gray-900 dark:text-white truncate">
                                {geoLoading ? 'Locating...' : (geoData.area || geoAddress.split(', ')[0] || 'Your Location')}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 line-clamp-2">
                                {geoLoading ? 'Fetching precise location...' : geoAddress}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-5 pt-3 pb-5">
                    <button
                        onClick={handleConfirmLocation}
                        disabled={geoLoading}
                        className="w-full h-[52px] bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl font-bold text-[15px] shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                    >
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );

    const activeContent = isMapViewVisible ? mapView : searchView;

    // ── Mobile: Bottom Sheet ────────────────────────────────
    if (isMobile) {
        return (
            <div className="fixed inset-0 z-[200]">
                <div
                    className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={close}
                />
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
                    style={{ height: isMapViewVisible ? '92vh' : '70vh' }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Select delivery location"
                >
                    {!isMapViewVisible && (
                        <div className="flex justify-center pt-2.5 pb-0 shrink-0">
                            <div className="w-9 h-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
                        </div>
                    )}
                    {activeContent}
                </div>
            </div>
        );
    }

    // ── Desktop: Right-side Drawer ──────────────────────────
    return (
        <div className="fixed inset-0 z-[200]">
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={close}
            />
            <div
                className={`absolute top-0 right-0 h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: isMapViewVisible ? '500px' : '400px' }}
                role="dialog"
                aria-modal="true"
                aria-label="Select delivery location"
            >
                {activeContent}
            </div>
        </div>
    );
}
