export const Input = ({ label, type='text', value, onChange, placeholder, readOnly, className }) => (
  <div className={`space-y-1.5 ${className||''}`}>
    {label && <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
    <input
      type={type} value={value} onChange={onChange}
      readOnly={readOnly} placeholder={placeholder}
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-[#0ceded] focus:ring-2 focus:ring-[#0ceded]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
    />
  </div>
);
