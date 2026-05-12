import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';
import { getCurrentLocation } from '../utils/locationUtils';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerIconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

export default function LeafletLocationPickerModal({ open, initialCenter, onClose, onConfirm }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [current, setCurrent] = useState(initialCenter || { lat: 28.6139, lng: 77.2090 });
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (open && initialCenter?.lat && initialCenter?.lng) {
      setCurrent({ lat: initialCenter.lat, lng: initialCenter.lng });
    }
  }, [open, initialCenter]);

  useEffect(() => {
    if (!open) return;
    if (!mapRef.current) return;

    const center = initialCenter || current;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([center.lat, center.lng], 16);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.marker([center.lat, center.lng]).addTo(map);

    map.on('moveend', () => {
      const c = map.getCenter();
      const next = { lat: c.lat, lng: c.lng };
      setCurrent(next);
      if (markerRef.current) markerRef.current.setLatLng([next.lat, next.lng]);
    });

    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [open]);

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const gps = await getCurrentLocation();
      setCurrent({ lat: gps.lat, lng: gps.lng });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([gps.lat, gps.lng], 17);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([gps.lat, gps.lng]);
      }
    } finally {
      setLocating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[78vh] bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Pin Your Exact Location</h3>
          <button onClick={onClose} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-300">Close</button>
        </div>

        <div className="relative flex-1">
          <div ref={mapRef} className="absolute inset-0" />
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {locating ? 'Locating...' : 'Use Current Location'}
          </button>
          <div className="text-[11px] text-gray-600 dark:text-gray-300 flex-1 truncate">
            Lat: {current.lat.toFixed(6)}, Lng: {current.lng.toFixed(6)}
          </div>
          <button
            type="button"
            onClick={() => onConfirm(current)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
