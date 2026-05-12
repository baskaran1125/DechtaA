import { useState, useRef } from 'react';
import { getInitials } from './KYCService';

export const ProfileImageUploader = ({ image, name, onChange, disabled }) => {
  const [showMenu, setShowMenu] = useState(false);
  const fileRef   = useRef();
  const cameraRef = useRef();

  const toBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.onerror   = rej;
      r.readAsDataURL(file);
    });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await toBase64(file);
    onChange(b64);
    setShowMenu(false);
  };

  return (
    <div className="relative inline-block">
      {/* Avatar circle */}
      <div
        onClick={() => !disabled && setShowMenu(p => !p)}
        className={`w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center relative
          ${!disabled ? 'cursor-pointer' : ''}`}>
        {image ? (
          <img src={image} alt="profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0ceded] to-blue-500 flex items-center justify-center">
            <span className="text-white font-black text-xl tracking-tight">{getInitials(name)}</span>
          </div>
        )}
        {/* Edit overlay */}
        {!disabled && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition rounded-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Edit badge */}
      {!disabled && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0ceded] rounded-full flex items-center justify-center shadow border-2 border-white dark:border-slate-900 cursor-pointer"
          onClick={() => setShowMenu(p => !p)}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </div>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-24 left-0 z-50 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl w-48 overflow-hidden fade-in">
          <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Open Camera
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </label>
          <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-t border-gray-50 dark:border-slate-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload from Device
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {/* Close menu on outside click */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
};
