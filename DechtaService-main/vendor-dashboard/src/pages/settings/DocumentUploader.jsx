import { useState, useRef } from 'react';
import { uploadVendorDocument } from '../../api/apiClient';

/**
 * DocumentUploader
 * Supports single-step or two-step (front/back) KYC uploads.
 * Shows thumbnail previews after upload.
 */
export const DocumentUploader = ({
  label,
  docKey,
  docs,
  onChange,
  twoSided = false,   // true for Aadhaar/PAN (front + back)
  multiple  = false,  // true for bank proofs
  disabled  = false,
}) => {
  const [step, setStep]         = useState(1); // 1=front, 2=back
  const [showBack, setShowBack] = useState(false);
  const frontRef = useRef();
  const backRef  = useRef();
  const multiRef = useRef();

  const toBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.onerror   = rej;
      r.readAsDataURL(file);
    });

  const fixUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const localBase = `${window.location.protocol}//${window.location.hostname}:5000`;
    return url.replace(/https?:\/\/your-public-backend-url\.com/gi, localBase);
  };

  const uploadAndResolve = async (file) => {
    try {
      const res = await uploadVendorDocument(file);
      const url = res?.data?.url || res?.data?.path;
      if (url) return fixUrl(url);
    } catch {
      // fall back to base64 if upload endpoint is unavailable
    }
    return await toBase64(file);
  };

  const handleFront = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const value = await uploadAndResolve(file);
    onChange({ ...docs, [`${docKey}_front`]: value });
    if (twoSided) setShowBack(true);
  };

  const handleBack = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const value = await uploadAndResolve(file);
    onChange({ ...docs, [`${docKey}_back`]: value });
    setShowBack(false);
  };

  const handleSingle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const value = await uploadAndResolve(file);
    onChange({ ...docs, [docKey]: value });
  };

  const handleMultiple = async (e) => {
    const files = Array.from(e.target.files);
    const existing = docs[docKey] || [];
    const newOnes  = await Promise.all(files.map(f => uploadAndResolve(f)));
    onChange({ ...docs, [docKey]: [...existing, ...newOnes] });
  };

  const removeMulti = (idx) => {
    const updated = (docs[docKey] || []).filter((_, i) => i !== idx);
    onChange({ ...docs, [docKey]: updated });
  };

  // ── Render ────────────────────────────────────────────────
  if (multiple) {
    const uploaded = docs[docKey] || [];
    return (
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
        {!disabled && (
          <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-3 hover:border-[#0ceded] transition">
            <div className="w-8 h-8 bg-[#0ceded]/10 rounded-lg flex items-center justify-center text-[#0ceded]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Upload Files</div>
              <div className="text-[10px] text-gray-400">Multiple allowed</div>
            </div>
            <input ref={multiRef} type="file" accept="image/*,.pdf" multiple onChange={handleMultiple} className="hidden" />
          </label>
        )}
        {uploaded.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {uploaded.map((src, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                <img src={src} alt="" className="w-full h-20 object-cover" />
                {!disabled && (
                  <button onClick={() => removeMulti(i)} type="button"
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (twoSided) {
    const front = docs[`${docKey}_front`];
    const back  = docs[`${docKey}_back`];
    return (
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
        <div className="grid grid-cols-2 gap-3">
          {/* Front */}
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Front Side</div>
            {front ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                <img src={front} alt="front" className="w-full h-24 object-cover" />
                {!disabled && (
                  <button type="button" onClick={() => { onChange({ ...docs, [`${docKey}_front`]: null }); setShowBack(false); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition">✕</button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[9px] font-bold text-center py-0.5">✓ Uploaded</div>
              </div>
            ) : (
              !disabled && (
                <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-[#0ceded] cursor-pointer transition text-gray-400 text-[10px] gap-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Upload Front
                  <input ref={frontRef} type="file" accept="image/*" onChange={handleFront} className="hidden" />
                </label>
              )
            )}
          </div>

          {/* Back */}
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              Back Side {showBack && <span className="text-[#0ceded] animate-pulse">← Upload now</span>}
            </div>
            {back ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                <img src={back} alt="back" className="w-full h-24 object-cover" />
                {!disabled && (
                  <button type="button" onClick={() => onChange({ ...docs, [`${docKey}_back`]: null })}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition">✕</button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[9px] font-bold text-center py-0.5">✓ Uploaded</div>
              </div>
            ) : (
              !disabled ? (
                <label className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition text-[10px] gap-1
                  ${showBack ? 'border-[#0ceded] text-[#0ceded] bg-[#0ceded]/5 animate-pulse' : 'border-gray-200 dark:border-slate-700 text-gray-400'}
                  ${!front ? 'opacity-40 pointer-events-none' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Upload Back
                  <input ref={backRef} type="file" accept="image/*" onChange={handleBack} className="hidden" disabled={!front} />
                </label>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-100 dark:border-slate-700 text-gray-300 text-[10px]">Not uploaded</div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single upload
  const uploaded = docs[docKey];
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      {uploaded ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
          <img src={uploaded} alt="" className="w-full h-32 object-cover" />
          {!disabled && (
            <button type="button" onClick={() => onChange({ ...docs, [docKey]: null })}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition">✕</button>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[10px] font-bold text-center py-1">✓ Uploaded</div>
        </div>
      ) : (
        !disabled && (
          <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-[#0ceded] transition">
            <div className="w-9 h-9 bg-[#0ceded]/10 rounded-lg flex items-center justify-center text-[#0ceded]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Click to Upload</div>
              <div className="text-[10px] text-gray-400">Image or PDF</div>
            </div>
            <input type="file" accept="image/*,.pdf" onChange={handleSingle} className="hidden" />
          </label>
        )
      )}
    </div>
  );
};
