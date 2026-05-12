import { useState } from 'react';
import LeafletLocationPickerModal from '../../components/LeafletLocationPickerModal';
import { getCurrentLocation, reverseGeocodeCoordinates } from '../../utils/locationUtils';

export const AddressTab = ({ data, onChange, disabled }) => {
  const f = data || {};
  const addresses = Array.isArray(f.addresses) ? f.addresses : [];

  const [showAddrForm, setShowAddrForm] = useState(true);
  const [addrLine1, setAddrLine1] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addressFormError, setAddressFormError] = useState('');
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [selectedLat, setSelectedLat] = useState(
    Number.isFinite(Number(f?.latitude ?? f?.lat)) ? Number(f.latitude ?? f.lat) : null
  );
  const [selectedLng, setSelectedLng] = useState(
    Number.isFinite(Number(f?.longitude ?? f?.lng)) ? Number(f.longitude ?? f.lng) : null
  );
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapInitialCenter, setMapInitialCenter] = useState({
    lat: Number.isFinite(Number(f?.latitude ?? f?.lat)) ? Number(f.latitude ?? f.lat) : 28.6139,
    lng: Number.isFinite(Number(f?.longitude ?? f?.lng)) ? Number(f.longitude ?? f.lng) : 77.2090,
  });

  const resetAddressForm = () => {
    setAddrLine1('');
    setAddrArea('');
    setAddrLandmark('');
    setAddrCity('');
    setAddrState('');
    setAddrPincode('');
    setAddressFormError('');
  };

  const buildAddressText = () => {
    const parts = [
      addrLine1.trim(),
      addrArea.trim(),
      addrLandmark.trim(),
      addrCity.trim(),
      addrState.trim(),
      addrPincode.trim(),
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSaveAddress = () => {
    if (!addrLine1.trim() || !addrArea.trim() || !addrCity.trim()) {
      setAddressFormError('Please add flat/house, area, and city before saving.');
      return;
    }

    const nextAddress = {
      id: Date.now(),
      tag: 'office',
      line1: addrLine1.trim(),
      area: addrArea.trim(),
      landmark: addrLandmark.trim(),
      city: addrCity.trim(),
      state: addrState.trim(),
      pincode: addrPincode.trim(),
      text: buildAddressText(),
      lat: selectedLat,
      lng: selectedLng,
    };

    const nextAddresses = [...addresses, nextAddress];
    onChange({
      ...f,
      addresses: nextAddresses,
      location: f.location || [nextAddress.city, nextAddress.state].filter(Boolean).join(', '),
      area: f.area || nextAddress.area,
      latitude: selectedLat,
      longitude: selectedLng,
      lat: selectedLat,
      lng: selectedLng,
      locationLabel: nextAddress.text,
    });

    resetAddressForm();
    setShowAddrForm(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setAddressFormError('');
      setIsLocatingAddress(true);
      const gps = await getCurrentLocation();
      setMapInitialCenter({ lat: gps.lat, lng: gps.lng });
      setMapPickerOpen(true);
    } catch (error) {
      setAddressFormError(error?.message || 'Unable to get current location.');
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const handleConfirmMapLocation = async ({ lat, lng }) => {
    try {
      setIsLocatingAddress(true);
      setAddressFormError('');
      setSelectedLat(lat);
      setSelectedLng(lng);
      const resolved = await reverseGeocodeCoordinates(lat, lng);

      if (resolved.area) setAddrArea(resolved.area);
      if (resolved.city) setAddrCity(resolved.city);
      if (resolved.state) setAddrState(resolved.state);
      if (resolved.pincode) setAddrPincode(String(resolved.pincode));

      setAddrLandmark(resolved.displayName || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
      setMapPickerOpen(false);
    } catch (error) {
      setAddressFormError(error?.message || 'Unable to fetch address from selected location.');
    } finally {
      setIsLocatingAddress(false);
    }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business Addresses</h4>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (showAddrForm) resetAddressForm();
            setShowAddrForm(!showAddrForm);
          }}
          className={`font-bold text-xs ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-[#0ceded] hover:underline'}`}
        >
          + Add New Address
        </button>
      </div>

      {addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
              <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400">{addr.tag || 'other'}</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-1">{addr.text}</p>
            </div>
          ))}
        </div>
      )}

      {showAddrForm && (
        <div className="p-4 md:p-5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-gray-900 dark:text-white">Deliver To</p>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocatingAddress}
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLocatingAddress ? 'Locating...' : 'Use Current Location'}
            </button>
          </div>

          {addressFormError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-xs font-semibold text-red-600 dark:text-red-300">
              {addressFormError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Flat / House / Building</label>
            <input
              type="text"
              value={addrLine1}
              onChange={(e) => setAddrLine1(e.target.value)}
              readOnly={disabled}
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
              readOnly={disabled}
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
              readOnly={disabled}
              className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Near metro, school, hospital"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">City</label>
              <input
                type="text"
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                readOnly={disabled}
                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">State</label>
              <input
                type="text"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                readOnly={disabled}
                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Pincode</label>
              <input
                type="text"
                value={addrPincode}
                onChange={(e) => setAddrPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                readOnly={disabled}
                className="w-full bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="6-digit pincode"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAddress}
            disabled={disabled}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {disabled ? 'Editing locked during verification' : 'Save Address'}
          </button>
        </div>
      )}

      <LeafletLocationPickerModal
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleConfirmMapLocation}
        initialCenter={mapInitialCenter}
      />

      {disabled && addresses.length === 0 && (
        <div className="text-xs text-gray-400">No saved addresses.</div>
      )}
    </div>
  );
};

export default AddressTab;
