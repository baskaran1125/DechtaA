import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShoppingBag, ChevronDown, ChevronUp, MapPin, Bike, Truck, Clock, Calendar, Mic, Square, Play, Trash2, AlertCircle, ThumbsUp, Loader } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { hardware } from '../data/products';
import { fetchDeliveryCharge, fetchVehiclePricing } from '../api/apiClient';
import { getCurrentLocation, reverseGeocodeCoordinates } from '../utils/distanceCalculator';

const AutoRickshawIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 15v-5.5a2.5 2.5 0 0 1 2.5-2.5h5a2.5 2.5 0 0 1 2.5 2.5V11l4.5 2v2"></path>
        <circle cx="6.5" cy="16.5" r="2.5"></circle>
        <circle cx="16.5" cy="16.5" r="2.5"></circle>
        <path d="M3 15h15"></path>
        <path d="M8 7v4h5"></path>
    </svg>
);

// Default vehicles shown before DB data loads (matches vehicle_pricing seed)
const DEFAULT_VEHICLES = [
    {
        type: '2w',
        name: 'Two Wheeler (2W)',
        icon: Bike,
        color: 'text-green-600',
        desc: 'Up to 20kg',
        tier: 1,
        base_fare: 29,
        options: [
            { id: '2w_standard', name: 'Standard Delivery', fee: 29, desc: '~30 mins' }
        ]
    },
    {
        type: '3w',
        name: 'Three Wheeler (Auto) (3W)',
        icon: AutoRickshawIcon,
        color: 'text-blue-600',
        desc: 'Up to 500kg',
        tier: 2,
        base_fare: 149,
        options: [
            { id: '3w_500kg', name: '3 Wheeler - 500 kg', fee: 149, desc: 'Up to 500kg' }
        ]
    },
    {
        type: '4w',
        name: '4 Wheeler Cargo',
        icon: Truck,
        color: 'text-orange-600',
        desc: 'Heavy cargo',
        tier: 3,
        base_fare: 399,
        options: [
            { id: '4w_750kg', name: '4 Wheeler - 750 kg', fee: 399, desc: 'Small Items' },
            { id: '4w_1200kg', name: '4 Wheeler - 1200 kg', fee: 499, desc: 'Medium Cargo' },
            { id: '4w_1700kg', name: '4 Wheeler - 1700 kg', fee: 599, desc: 'Large Cargo' },
            { id: '4w_2500kg', name: '4 Wheeler - 2500 kg', fee: 799, desc: 'Extra Large' }
        ]
    }
];

export default function CheckoutModal({ open, onClose, onPay }) {
    const { cartItems, addToCart, cartTotal, finalTotal, discountAmount, couponApplied, getMaxTier } = useCart();
    const { userData, selectAddress, addAddress } = useAuth();
    const { deliveryAddress } = useLocation();
    const [itemsExpanded, setItemsExpanded] = useState(false);

    // Delivery Vehicle State
    const [expandedVehicleType, setExpandedVehicleType] = useState(null);
    const [activeVehicleOptionId, setActiveVehicleOptionId] = useState(null);
    const [selectedBodyType, setSelectedBodyType] = useState('');

    // Vehicles loaded from backend
    const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);

    // Delivery fee state
    const [deliveryFee, setDeliveryFee] = useState(DEFAULT_VEHICLES[0].options[0].fee);
    const [deliveryPricing, setDeliveryPricing] = useState({
        distance_km: null,
        base_fare: null,
        rate_per_km: null,
        min_km: null,
        extra_km: null,
    });
    const [feeLoading, setFeeLoading] = useState(false);
    const feeAbortRef = useRef(null);

    // Address modal state
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [addrTag, setAddrTag] = useState('home');
    const [addrLine1, setAddrLine1] = useState('');
    const [addrArea, setAddrArea] = useState('');
    const [addrLandmark, setAddrLandmark] = useState('');
    const [addrCity, setAddrCity] = useState('');
    const [addrState, setAddrState] = useState('');
    const [addrPincode, setAddrPincode] = useState('');
    const [addrLatLng, setAddrLatLng] = useState(null);
    const [isLocatingAddress, setIsLocatingAddress] = useState(false);
    const [addressFormError, setAddressFormError] = useState('');

    // New Delivery Features State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleTime, setScheduleTime] = useState('10:00');

    const [quickInstruction, setQuickInstruction] = useState('');
    const [customInstruction, setCustomInstruction] = useState('');

    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [voiceBlob, setVoiceBlob] = useState(null);
    const [voiceUrl, setVoiceUrl] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);

    // Tipping State
    const [tipAmount, setTipAmount] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [showCustomTip, setShowCustomTip] = useState(false);

    // GST State
    const [hasGst, setHasGst] = useState(false);
    const [gstData, setGstData] = useState({
        gstin: '',
        businessName: '',
        businessAddress: '',
        businessEmail: ''
    });

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setVoiceBlob(blob);
                setVoiceUrl(URL.createObjectURL(blob));
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Microphone access denied or not supported.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const deleteRecording = () => {
        setVoiceBlob(null);
        setVoiceUrl(null);
    };

    const tier = getMaxTier();
    const toFiniteNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    // Load vehicle pricing from backend on mount
    useEffect(() => {
        fetchVehiclePricing()
            .then(res => {
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    // Merge DB pricing into our UI vehicle list
                    setVehicles(prev => prev.map(v => {
                        const dbRow = res.data.find(r => r.vehicle_type === v.type);
                        if (!dbRow) return v;
                        return {
                            ...v,
                            base_fare: Number(dbRow.base_fare),
                            options: Array.isArray(v.options)
                                ? v.options.map((opt, i) => ({
                                    ...opt,
                                    fee: i === 0
                                        ? Number(dbRow.base_fare)
                                        : Number(dbRow.base_fare) + (i * 30)
                                }))
                                : []
                        };
                    }));
                }
            })
            .catch(() => { /* use defaults */ });
    }, []);

    // Initialize defaults when modal opens
    useEffect(() => {
        if (open && !activeVehicleOptionId) {
            const recommendedVehicle = vehicles.find(v => v.tier >= tier) || vehicles[vehicles.length - 1] || DEFAULT_VEHICLES[0];
            const recommendedOption = Array.isArray(recommendedVehicle.options) ? recommendedVehicle.options[0] : null;
            if (!recommendedOption) return;
            setExpandedVehicleType(recommendedVehicle.type);
            setActiveVehicleOptionId(recommendedOption.id);
            setDeliveryFee(recommendedOption.fee);
        }
    }, [open, tier, vehicles, activeVehicleOptionId]);

    // Recalculate delivery fee whenever vehicle option or address changes
    const selectedAddr = userData.addresses.find(a => a.selected);
    useEffect(() => {
        if (!open || !activeVehicleOptionId) return;

        const selectedVehicle = vehicles.find(v => Array.isArray(v.options) && v.options.some(opt => opt.id === activeVehicleOptionId));
        const selectedOption = Array.isArray(selectedVehicle?.options)
            ? selectedVehicle.options.find(opt => opt.id === activeVehicleOptionId) || null
            : null;
        const vehicleType = selectedVehicle?.type || null;
        const fallbackOptionFee = Number(selectedOption?.fee ?? 0);
        const baseFare = Number(selectedVehicle?.base_fare ?? 0);
        const optionPremium = Math.max(0, Number((fallbackOptionFee - baseFare).toFixed(2)));

        const firstItemWithPickup = cartItems.find((item) =>
            toFiniteNumber(item?.vendor_lat) != null && toFiniteNumber(item?.vendor_lng) != null
        );
        const originLat = toFiniteNumber(firstItemWithPickup?.vendor_lat);
        const originLng = toFiniteNumber(firstItemWithPickup?.vendor_lng);

        const destLat = toFiniteNumber(selectedAddr?.lat ?? selectedAddr?.latitude ?? deliveryAddress?.lat);
        const destLng = toFiniteNumber(selectedAddr?.lng ?? selectedAddr?.longitude ?? deliveryAddress?.lng);

        if (vehicleType && originLat != null && originLng != null && destLat != null && destLng != null) {
            if (feeAbortRef.current) clearTimeout(feeAbortRef.current);
            setFeeLoading(true);

            feeAbortRef.current = setTimeout(() => {
                fetchDeliveryCharge(vehicleType, originLat, originLng, destLat, destLng)
                    .then(res => {
                        if (res.success && res.data?.delivery_charge != null) {
                            const apiCharge = Number(res.data.delivery_charge);
                            const finalCharge = Number((apiCharge + optionPremium).toFixed(2));
                            setDeliveryFee(finalCharge);
                            setDeliveryPricing({
                                distance_km: toFiniteNumber(res.data.distance_km),
                                base_fare: toFiniteNumber(res.data.base_fare),
                                rate_per_km: toFiniteNumber(res.data.rate_per_km),
                                min_km: toFiniteNumber(res.data.min_km),
                                extra_km: toFiniteNumber(res.data.extra_km),
                            });
                        }
                    })
                    .catch(() => {
                        setDeliveryFee(fallbackOptionFee);
                        setDeliveryPricing({
                            distance_km: null,
                            base_fare: null,
                            rate_per_km: null,
                            min_km: null,
                            extra_km: null,
                        });
                    })
                    .finally(() => setFeeLoading(false));
            }, 400);
        } else {
            setDeliveryFee(fallbackOptionFee);
            setDeliveryPricing({
                distance_km: null,
                base_fare: null,
                rate_per_km: null,
                min_km: null,
                extra_km: null,
            });
            setFeeLoading(false);
        }
    }, [open, activeVehicleOptionId, selectedAddr, cartItems, vehicles, deliveryAddress]);

    useEffect(() => () => {
        if (feeAbortRef.current) clearTimeout(feeAbortRef.current);
    }, []);

    if (!open) return null;

    const selectedAddr2 = userData.addresses.find(a => a.selected);
    const selectedAddressLat = toFiniteNumber(selectedAddr2?.lat ?? selectedAddr2?.latitude);
    const selectedAddressLng = toFiniteNumber(selectedAddr2?.lng ?? selectedAddr2?.longitude);
    const selectedVehicleCategory = vehicles.find(v =>
        v.options.some(opt => opt.id === activeVehicleOptionId)
    );
    const selectedVehicleOption = selectedVehicleCategory?.options.find(opt => opt.id === activeVehicleOptionId) || null;
    const selectedPickupItem = cartItems.find((item) =>
        toFiniteNumber(item?.vendor_lat) != null && toFiniteNumber(item?.vendor_lng) != null
    );
    const resolvedPickupLat = toFiniteNumber(selectedPickupItem?.vendor_lat);
    const resolvedPickupLng = toFiniteNumber(selectedPickupItem?.vendor_lng);
    const fallbackAddressText = [
        deliveryAddress?.street,
        deliveryAddress?.city,
        deliveryAddress?.state,
        deliveryAddress?.zip
    ].filter(Boolean).join(', ') || deliveryAddress?.label || '';
    const resolvedAddressText = selectedAddr2?.address_text || selectedAddr2?.text || fallbackAddressText || '';
    const resolvedAddressLat = selectedAddressLat ?? toFiniteNumber(deliveryAddress?.lat);
    const resolvedAddressLng = selectedAddressLng ?? toFiniteNumber(deliveryAddress?.lng);
    const resolvedAddressArea = selectedAddr2?.area || deliveryAddress?.street || '';
    const resolvedAddressCity = selectedAddr2?.city || deliveryAddress?.city || '';
    const resolvedAddressState = selectedAddr2?.state || deliveryAddress?.state || '';
    const resolvedAddressPincode = selectedAddr2?.zip || selectedAddr2?.pincode || deliveryAddress?.zip || '';
    const vehicleOptionPremium = selectedVehicleCategory
        ? Math.max(
            0,
            Number(
                (
                    Number(selectedVehicleOption?.fee || 0) -
                    Number(selectedVehicleCategory.base_fare || 0)
                ).toFixed(2)
            )
        )
        : 0;

    // Suggestion items — pick items not already in cart
    const cartIds = new Set(cartItems.map(i => i.id));
    const suggestions = hardware.filter(h => !cartIds.has(h.id)).slice(0, 4);

    const resetAddressForm = () => {
        setAddrTag('home');
        setAddrLine1('');
        setAddrArea('');
        setAddrLandmark('');
        setAddrCity('');
        setAddrState('');
        setAddrPincode('');
        setAddrLatLng(null);
        setAddressFormError('');
    };

    const buildAddressText = () => {
        const parts = [
            addrLine1.trim(),
            addrArea.trim(),
            addrLandmark.trim(),
            addrCity.trim(),
            addrState.trim(),
            addrPincode.trim()
        ].filter(Boolean);
        return parts.join(', ');
    };

    const handleSaveAddress = () => {
        const composedAddress = buildAddressText();
        if (!addrLine1.trim() || !addrArea.trim() || !addrCity.trim()) {
            setAddressFormError('Please add flat/house, area, and city before saving.');
            return;
        }

        addAddress({
            tag: addrTag,
            text: composedAddress,
            lat: addrLatLng?.lat,
            lng: addrLatLng?.lng
        });
        resetAddressForm();
        setShowAddrForm(false);
    };

    const handleUseCurrentLocationForAddress = async () => {
        try {
            setIsLocatingAddress(true);
            setAddressFormError('');

            const location = await getCurrentLocation({
                minAccuracyMeters: 120,
                maxSampleTimeMs: 12000
            });
            const resolved = await reverseGeocodeCoordinates(location.lat, location.lng);
            const displayParts = String(resolved.displayName || '')
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
            const fallbackArea = displayParts[0] || '';
            const fallbackCity = displayParts[1] || '';

            setAddrLatLng({ lat: location.lat, lng: location.lng });
            setAddrArea(resolved.area || resolved.street || fallbackArea);
            setAddrCity(resolved.city || fallbackCity);
            setAddrState(resolved.state || '');
            setAddrPincode(resolved.zip || '');
            setAddressFormError('');
        } catch (error) {
            setAddressFormError(error?.message || 'Unable to fetch your current location.');
        } finally {
            setIsLocatingAddress(false);
        }
    };

    const toggleVehicleType = (type) => {
        setExpandedVehicleType(expandedVehicleType === type ? null : type);
    };

    const shouldAskBodyType = selectedVehicleCategory && ['3w', '4w'].includes(selectedVehicleCategory.type);

    // Alias for JSX usage
    const VEHICLES = vehicles;

    return (
        <div className="fixed inset-0 z-[210] bg-gray-100 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto h-full flex flex-col md:flex-row">

                {/* === Left Side: Suggestions (desktop only) === */}
                <div className="w-full md:w-5/12 bg-gray-50 dark:bg-slate-900 p-6 md:p-10 border-r border-gray-200 dark:border-slate-800 overflow-y-auto relative hidden md:block">
                    <button onClick={onClose} className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Frequently added together</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Customers who booked this also added these essentials.</p>
                        <div className="space-y-4">
                            {suggestions.map(item => {
                                const price = Number(item.price) || 0;
                                const mrp = Number(item.mrp) || Math.round(price * 1.2);
                                return (
                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                        <img src={item.img} className="w-16 h-16 object-contain rounded-lg bg-gray-50 dark:bg-slate-700 p-1" alt={item.name} onError={e => e.target.src = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100'} />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-black text-sm text-gray-900 dark:text-white">₹{price.toLocaleString('en-IN')}</span>
                                                {mrp > price && <span className="text-xs text-gray-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price), img: item.img, tier: item.tier || 1 })}
                                            className="shrink-0 px-4 py-2 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 rounded-lg text-xs font-bold uppercase hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors">
                                            + Add
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* === Right Side: Checkout Steps === */}
                <div className="w-full md:w-7/12 bg-white dark:bg-slate-950 flex flex-col h-full">
                    {/* Mobile header */}
                    <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center md:hidden">
                        <button onClick={onClose} className="dark:text-white"><ArrowLeft className="w-6 h-6" /></button>
                        <h3 className="font-bold dark:text-white">Checkout</h3>
                        <div className="w-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-12">

                        {/* Step 0: Order Review (collapsible) */}
                        <div className="mb-8 border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50 dark:bg-slate-900">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setItemsExpanded(!itemsExpanded)}>
                                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                                    <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs"><ShoppingBag className="w-3 h-3" /></span>
                                    Order Summary
                                </h3>
                                {itemsExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </div>
                            {itemsExpanded && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <img src={item.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100'} className="w-10 h-10 object-contain rounded-lg" alt={item.name} />
                                                <span className="dark:text-gray-300">{item.name} × {item.qty}</span>
                                            </div>
                                            <span className="font-bold dark:text-white">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 1: Address */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <span className="w-6 h-6 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-xs">1</span>
                                Address Details
                            </h3>
                            <div className="space-y-3">
                                {userData.addresses.length === 0 && (
                                    <p className="text-sm text-gray-400">No saved addresses yet.</p>
                                )}
                                {userData.addresses.map(addr => (
                                    <div key={addr.id}
                                        onClick={() => selectAddress(addr.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${addr.selected
                                            ? 'border-black dark:border-white bg-gray-50 dark:bg-slate-800'
                                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'}`}>
                                        <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${addr.selected ? 'text-black dark:text-cyan-400' : 'text-gray-400'}`} />
                                        <div>
                                            <p className="font-bold text-sm dark:text-white">{addr.tag}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{addr.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    if (showAddrForm) {
                                        resetAddressForm();
                                    }
                                    setShowAddrForm(!showAddrForm);
                                }}
                                className="text-qc-yellow font-bold text-sm mt-3 flex items-center gap-1 hover:underline"
                            >
                                + Add New Address
                            </button>

                            {/* Inline address form */}
                            {showAddrForm && (
                                <div className="mt-4 p-4 md:p-5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-bold text-gray-900 dark:text-white">Deliver To</p>
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentLocationForAddress}
                                            disabled={isLocatingAddress}
                                            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLocatingAddress ? (
                                                <>
                                                    <Loader className="w-3 h-3 animate-spin" />
                                                    Locating...
                                                </>
                                            ) : (
                                                <>
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    Use Current Location
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {addressFormError && (
                                        <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-xs font-semibold text-red-600 dark:text-red-300">
                                            {addressFormError}
                                        </div>
                                    )}

                                    {!!addrArea && (
                                        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Detected Area</p>
                                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 mt-1">{addrArea}{addrCity ? `, ${addrCity}` : ''}</p>
                                            {addrState && <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">{addrState}{addrPincode ? ` - ${addrPincode}` : ''}</p>}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Flat / House / Building</label>
                                        <input
                                            type="text"
                                            value={addrLine1}
                                            onChange={(e) => setAddrLine1(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Flat no, Building name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Area / Locality</label>
                                        <input
                                            type="text"
                                            value={addrArea}
                                            onChange={(e) => setAddrArea(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Area, Sector, Colony"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Landmark (optional)</label>
                                        <input
                                            type="text"
                                            value={addrLandmark}
                                            onChange={(e) => setAddrLandmark(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Near metro, school, hospital"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">City</label>
                                            <input
                                                type="text"
                                                value={addrCity}
                                                onChange={(e) => setAddrCity(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">State</label>
                                            <input
                                                type="text"
                                                value={addrState}
                                                onChange={(e) => setAddrState(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="State"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Pincode</label>
                                            <input
                                                type="text"
                                                value={addrPincode}
                                                onChange={(e) => setAddrPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="6-digit pincode"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Address Type</label>
                                        <div className="flex gap-2">
                                            {['home', 'office', 'other'].map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => setAddrTag(tag)}
                                                    className={`flex-1 py-2 border rounded-xl text-sm font-bold capitalize transition-colors ${addrTag === tag
                                                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                                        : 'text-gray-500 border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveAddress}
                                        className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg"
                                    >
                                        Save Address
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Delivery Vehicle */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <span className="w-6 h-6 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-xs">2</span>
                                Delivery Vehicle
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">We suggest the best vehicle for your items, but you can choose any.</p>

                            <div className="flex flex-col gap-3 w-full">
                                {VEHICLES.map(vType => {
                                    const isExpanded = expandedVehicleType === vType.type;
                                    const options = Array.isArray(vType.options) ? vType.options : [];
                                    const hasSelectedOption = options.some(opt => activeVehicleOptionId === opt.id);
                                    const isSuggested = tier === vType.tier;
                                    const Icon = vType.icon;

                                    return (
                                        <div key={vType.type} className={`relative w-full border-2 rounded-xl transition-all overflow-hidden ${hasSelectedOption ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                            <div onClick={() => toggleVehicleType(vType.type)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm text-2xl relative">
                                                        {isSuggested && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">BEST</div>}
                                                        <Icon className={`w-6 h-6 ${vType.color}`} />
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-bold text-slate-800 dark:text-white text-base">{vType.name}</span>
                                                        <span className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">{vType.desc}</span>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                            </div>

                                            {/* Expandable Options */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                                    {options.map((opt, index) => (
                                                        <div key={opt.id} onClick={() => setActiveVehicleOptionId(opt.id)} className={`flex items-center gap-4 p-4 pl-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${index !== options.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${activeVehicleOptionId === opt.id ? 'border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                {activeVehicleOptionId === opt.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                                                            </div>
                                                            <div className="flex flex-col flex-1 text-left">
                                                                <span className="font-bold text-slate-800 dark:text-white text-sm">{opt.name}</span>
                                                                <span className="text-xs text-slate-500 dark:text-gray-400">{opt.desc}</span>
                                                            </div>
                                                            <div className="font-black text-slate-800 dark:text-white">
                                                                ₹{opt.fee}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {shouldAskBodyType && (
                                <div className="mt-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900">
                                    <p className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Vehicle Body Type</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Select body type to match driver vehicle exactly.</p>
                                    <div className="flex gap-2">
                                        {['Open', 'Closed'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSelectedBodyType(type)}
                                                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${selectedBodyType === type ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-600'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional Delivery Features */}
                        <div className="space-y-6 mb-8">
                            {/* Schedule Section */}
                            <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Schedule Delivery</h4>
                                            <p className="text-xs text-gray-500">Pick a convenient time</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsScheduled(!isScheduled)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${isScheduled ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isScheduled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {isScheduled && (
                                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                                            <input
                                                type="date"
                                                value={scheduleDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold dark:text-white focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Time (9 AM - 6 PM)</label>
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                min="09:00"
                                                max="18:00"
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm font-bold dark:text-white focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium">Delivery is only available between 9:00 AM and 6:00 PM.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tipping Section */}
                            <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-qc-yellow/10 rounded-lg">
                                        <ThumbsUp className="w-5 h-5 text-qc-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Tip your delivery partner</h4>
                                        <p className="text-xs text-gray-500">100% of the tip goes to the driver</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[20, 30, 50].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => { setTipAmount(amt); setShowCustomTip(false); }}
                                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${tipAmount === amt ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-white text-gray-600 border-gray-100 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 hover:border-gray-300'}`}
                                        >
                                            ₹{amt}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowCustomTip(true)}
                                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${showCustomTip ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'bg-white text-gray-600 border-gray-100 dark:bg-slate-800 dark:text-gray-300'}`}
                                    >
                                        Custom
                                    </button>
                                    {tipAmount > 0 && (
                                        <button onClick={() => { setTipAmount(0); setCustomTip(''); setShowCustomTip(false); }} className="text-xs font-bold text-gray-400 hover:text-red-500 ml-auto">Clear</button>
                                    )}
                                </div>
                                {showCustomTip && (
                                    <div className="mt-3 animate-fade-in">
                                        <input
                                            type="number"
                                            placeholder="Enter amount..."
                                            value={customTip}
                                            onChange={(e) => {
                                                setCustomTip(e.target.value);
                                                setTipAmount(Number(e.target.value) || 0);
                                            }}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Instructions Section */}
                            <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Delivery Instructions</h4>

                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                                    {["Leave at doorstep", "Leave outside gate", "Give to neighbor"].map(msg => (
                                        <button
                                            key={msg}
                                            onClick={() => setQuickInstruction(msg)}
                                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${quickInstruction === msg ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-slate-800 hover:border-gray-300'}`}
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    placeholder="Add custom directions for the driver..."
                                    value={customInstruction}
                                    onChange={(e) => setCustomInstruction(e.target.value)}
                                    className="w-full mt-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-cyan-500 min-h-[80px]"
                                />

                                {/* Voice Instruction UI */}
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                                <Mic className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-gray-500'}`} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {isRecording ? 'Recording...' : voiceUrl ? 'Voice note recorded' : 'Add a voice note'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isRecording ? (
                                                <button onClick={stopRecording} className="p-2 bg-gray-900 text-white rounded-full">
                                                    <Square className="w-3 h-3" />
                                                </button>
                                            ) : voiceUrl ? (
                                                <>
                                                    <button onClick={() => new Audio(voiceUrl).play()} className="p-2 bg-cyan-500 text-white rounded-full transition-transform active:scale-90">
                                                        <Play className="w-3 h-3 fill-current" />
                                                    </button>
                                                    <button onClick={deleteRecording} className="p-2 bg-red-50 text-red-500 rounded-full">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={startRecording} className="px-3 py-1.5 bg-gray-900 dark:bg-white dark:text-black text-white text-[10px] font-black uppercase rounded-lg">
                                                    Record
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                            {/* GST Section */}
                            <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm transition-all mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">I have a GST number</h4>
                                        <p className="text-sm text-gray-400">Optional</p>
                                    </div>
                                    <button
                                        onClick={() => setHasGst(!hasGst)}
                                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${hasGst ? 'bg-red-500 border-red-500' : 'bg-white border-2 border-gray-300'}`}
                                    >
                                        {hasGst && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {hasGst && (
                                    <div className="mt-6 space-y-4 animate-fade-in">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="GSTIN *"
                                                value={gstData.gstin}
                                                onChange={(e) => setGstData({ ...gstData, gstin: e.target.value.toUpperCase() })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm font-bold dark:text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Business Name *"
                                                value={gstData.businessName}
                                                onChange={(e) => setGstData({ ...gstData, businessName: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm font-bold dark:text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute top-2 left-4 text-[10px] font-bold text-gray-400 uppercase">Business Address</div>
                                            <textarea
                                                placeholder="Business Address"
                                                value={gstData.businessAddress}
                                                onChange={(e) => setGstData({ ...gstData, businessAddress: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900/30 rounded-xl px-4 pt-7 pb-4 text-sm font-bold dark:text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-300"
                                                rows="2"
                                            />
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                placeholder="Business Email"
                                                value={gstData.businessEmail}
                                                onChange={(e) => setGstData({ ...gstData, businessEmail: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm font-bold dark:text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 text-[11px] text-red-600 dark:text-red-400 font-medium leading-tight">
                                            In case of invalid/cancelled GSTIN, this booking shall be considered as personal booking
                                        </div>
                                    </div>
                                )}
                            </div>

                        {/* Step 3: Payment Summary */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <span className="w-6 h-6 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-xs">3</span>
                                Payment
                            </h3>
                            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 dark:text-gray-400">Item Total</span>
                                    <span className="font-bold dark:text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
                                    <span className="font-bold dark:text-white flex items-center gap-1">
                                        {feeLoading
                                            ? <Loader className="w-3 h-3 animate-spin text-cyan-500" />
                                            : `₹${deliveryFee}`
                                        }
                                    </span>
                                </div>
                                {deliveryPricing.distance_km != null && (
                                    <div className="flex justify-between text-[11px] mb-2 text-gray-500 dark:text-gray-400">
                                        <span>Delivery Distance</span>
                                        <span className="font-semibold">{Number(deliveryPricing.distance_km).toFixed(2)} km</span>
                                    </div>
                                )}
                                {tipAmount > 0 && (
                                    <div className="flex justify-between text-sm mb-2 text-cyan-600 font-bold">
                                        <span>Tip Amount</span>
                                        <span>₹{tipAmount}</span>
                                    </div>
                                )}
                                {couponApplied && (
                                    <div className="flex justify-between text-sm mb-4 text-green-600 font-bold">
                                        <span>Coupon Discount</span>
                                        <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 dark:border-slate-800 pt-3 flex justify-between items-center">
                                    <span className="font-bold text-lg dark:text-white">To Pay</span>
                                    <span className="font-black text-xl dark:text-white">₹{(finalTotal + deliveryFee + tipAmount).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="p-6 border-t border-gray-100 dark:border-slate-800">
                        <button onClick={() => {
                            if (shouldAskBodyType && !selectedBodyType) {
                                alert('Please select vehicle body type: Open or Closed');
                                return;
                            }
                            const finalInstructions = {
                                quick: quickInstruction,
                                custom: customInstruction,
                                voiceUrl: voiceUrl
                            };
                            const deliverySchedule = isScheduled ? { date: scheduleDate, time: scheduleTime } : null;
                            onPay({
                                 tip: tipAmount,
                                 instructions: finalInstructions,
                                 schedule: deliverySchedule,
                                 gst: hasGst ? gstData : null,
                                 address: resolvedAddressText,
                                 addressTag: selectedAddr2?.tag || addrTag || 'other',
                                 addressLat: resolvedAddressLat != null ? Number(resolvedAddressLat) : null,
                                 addressLng: resolvedAddressLng != null ? Number(resolvedAddressLng) : null,
                                 addressArea: resolvedAddressArea,
                                 addressCity: resolvedAddressCity,
                                 addressState: resolvedAddressState,
                                 addressPincode: resolvedAddressPincode,
                                 addressLandmark: selectedAddr2?.landmark || '',
                                 vehicle: selectedVehicleCategory ? {
                                     type: selectedVehicleCategory.type,
                                     name: selectedVehicleCategory.name,
                                     tier: selectedVehicleCategory.tier,
                                     option_id: selectedVehicleOption?.id || null,
                                     option_name: selectedVehicleOption?.name || null,
                                     option_desc: selectedVehicleOption?.desc || null,
                                     body_type: selectedBodyType || null,
                                     base_fare: Number(selectedVehicleCategory.base_fare || 0),
                                     option_fee: Number(selectedVehicleOption?.fee || 0),
                                     option_premium: vehicleOptionPremium,
                                 } : null,
                                 pickup_lat: resolvedPickupLat,
                                 pickup_lng: resolvedPickupLng,
                                 delivery_fee: Number(deliveryFee) || 0,
                                 delivery_distance_km: deliveryPricing.distance_km,
                                 delivery_pricing: deliveryPricing,
                             });
                        }} className="w-full bg-qc-yellow text-black py-4 rounded-xl font-bold hover:bg-qc-primary transition-all shadow-lg text-lg flex items-center justify-center gap-2">
                            Proceed to Pay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
