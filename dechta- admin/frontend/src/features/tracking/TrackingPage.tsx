import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MapPinIcon, Truck, Wrench, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import type { LocationUpdate, Driver, Manpower } from "@/types";

interface TrackingPageProps {
    locations: LocationUpdate[] | undefined;
    locationsLoading: boolean;
    drivers: Driver[] | undefined;
    manpower: Manpower[] | undefined;
}

export default function TrackingPage({ locations: initialLocations, locationsLoading, drivers, manpower }: TrackingPageProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUnmountedRef = useRef(false);

    const [wsConnected, setWsConnected] = useState(false);
    const [liveLocations, setLiveLocations] = useState<LocationUpdate[]>([]);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const resolveTrackingWsUrl = () => {
        const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim();
        if (configuredApiUrl) {
            const sanitizedApiUrl = configuredApiUrl.replace(/\/api$/i, "").replace(/\/+$/, "");
            const wsBase = sanitizedApiUrl
                .replace(/^https:/i, "wss:")
                .replace(/^http:/i, "ws:");
            return `${wsBase}/ws/tracking`;
        }

        // In local dev, backend is proxied through the Vite dev server.
        if (import.meta.env.DEV) {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${window.location.host}/ws/tracking`;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/ws/tracking`;
    };

    // Use live locations if available, fallback to initial (REST) locations
    const locations = liveLocations.length > 0 ? liveLocations : (initialLocations || []);

    // WebSocket connection
    const connectWs = useCallback(() => {
        if (isUnmountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = resolveTrackingWsUrl();
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setWsConnected(true);
            console.log("[WS] Connected to tracking server");
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "initial_locations") {
                    setLiveLocations(msg.data);
                    setLastUpdate(new Date());
                } else if (msg.type === "location_update") {
                    setLiveLocations((prev) => {
                        const updated = prev.filter(
                            (l) => !(l.entityType === msg.data.entityType && l.entityId === msg.data.entityId)
                        );
                        return [msg.data, ...updated];
                    });
                    setLastUpdate(new Date());
                }
            } catch {}
        };

        ws.onclose = () => {
            setWsConnected(false);
            wsRef.current = null;
            if (isUnmountedRef.current) return;
            // Reconnect after 3 seconds
            reconnectTimerRef.current = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        isUnmountedRef.current = false;
        connectWs();
        return () => {
            isUnmountedRef.current = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
            wsRef.current?.close();
        };
    }, [connectWs]);

    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Dynamically import leaflet to avoid SSR issues
        import("leaflet").then((L) => {
            // Guard: component may have unmounted during async import
            if (!mapRef.current) return;

            // Fix default marker icon
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            });

            const map = L.map(mapRef.current!, {
                center: [20.5937, 78.9629], // India center
                zoom: 5,
                zoomControl: true,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            mapInstanceRef.current = map;

            // Resize observer for the map container
            const resizeObserver = new ResizeObserver(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            });
            resizeObserver.observe(mapRef.current!);
            resizeObserverRef.current = resizeObserver;
        });

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update markers when locations change
    useEffect(() => {
        if (!mapInstanceRef.current || !locations) return;

        import("leaflet").then((L) => {
            const map = mapInstanceRef.current;
            if (!map) return;

            // Clear old markers
            markersRef.current.forEach(m => map.removeLayer(m));
            markersRef.current = [];

            locations.forEach((loc) => {
                const lat = parseFloat(loc.latitude);
                const lng = parseFloat(loc.longitude);
                if (isNaN(lat) || isNaN(lng)) return;

                const isDriver = loc.entityType === "driver";
                const entity = isDriver
                    ? drivers?.find(d => String(d.id) === loc.entityId)
                    : manpower?.find(w => w.id === loc.entityId);

                const name = isDriver
                    ? (entity as Driver)?.name || `Driver #${loc.entityId}`
                    : (entity as Manpower)?.fullName || `Worker #${loc.entityId}`;

                const color = isDriver ? "#3b82f6" : "#8b5cf6";

                const icon = L.divIcon({
                    html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${isDriver ? '🚚' : '🔧'}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    className: "",
                });

                const speed = parseFloat(loc.speed) || 0;
                const popupContent = `
                    <div style="min-width:160px;">
                        <strong>${name}</strong><br/>
                        <span style="color:#666;font-size:12px;">${isDriver ? 'Driver' : 'Worker'}</span><br/>
                        <span style="font-size:12px;">Speed: ${speed.toFixed(1)} km/h</span><br/>
                        <span style="font-size:11px;color:#999;">Updated: ${new Date(loc.updatedAt).toLocaleTimeString()}</span>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupContent);
                markersRef.current.push(marker);
            });

            // Fit bounds if we have locations
            if (locations.length > 0) {
                const bounds = L.latLngBounds(
                    locations
                        .filter(l => !isNaN(parseFloat(l.latitude)) && !isNaN(parseFloat(l.longitude)))
                        .map(l => [parseFloat(l.latitude), parseFloat(l.longitude)] as [number, number])
                );
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                }
            }
        });
    }, [locations, drivers, manpower]);

    const driverLocations = locations?.filter(l => l.entityType === "driver") || [];
    const workerLocations = locations?.filter(l => l.entityType === "worker") || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MapPinIcon className="w-6 h-6 text-cyan-600" />
                        Real-time GPS Tracking
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        {wsConnected ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <Wifi className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600 font-medium">Live</span>
                                {lastUpdate && (
                                    <span className="text-gray-400"> &middot; Last update: {lastUpdate.toLocaleTimeString()}</span>
                                )}
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-amber-600 font-medium">Connecting...</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge label={`${driverLocations.length} Drivers`} colorClass="bg-blue-100 text-blue-700" />
                    <StatusBadge label={`${workerLocations.length} Workers`} colorClass="bg-purple-100 text-purple-700" />
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { wsRef.current?.close(); connectWs(); }}>
                        <RefreshCw className="w-4 h-4" /> Reconnect
                    </Button>
                </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
                />
                <div ref={mapRef} className="w-full h-[500px]" />
            </div>

            {/* Location List */}
            {locationsLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
            ) : locations && locations.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map((loc) => {
                        const isDriver = loc.entityType === "driver";
                        const entity = isDriver
                            ? drivers?.find(d => String(d.id) === loc.entityId)
                            : manpower?.find(w => w.id === loc.entityId);
                        const name = isDriver
                            ? (entity as Driver)?.name || `Driver #${loc.entityId}`
                            : (entity as Manpower)?.fullName || `Worker #${loc.entityId}`;

                        return (
                            <div key={loc.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full ${isDriver ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                        {isDriver ? <Truck className="w-4 h-4 text-blue-600" /> : <Wrench className="w-4 h-4 text-purple-600" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{name}</p>
                                        <p className="text-xs text-gray-500">{isDriver ? 'Driver' : 'Worker'}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Lat: {parseFloat(loc.latitude).toFixed(6)}</span>
                                        <span>Lng: {parseFloat(loc.longitude).toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Speed: {parseFloat(loc.speed || "0").toFixed(1)} km/h</span>
                                        <span className="text-xs text-gray-400">{new Date(loc.updatedAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No active locations</p>
                    <p className="text-sm text-gray-400 mt-1">Drivers and workers will appear here when they send location updates</p>
                </div>
            )}
        </div>
    );
}
