export const ToggleSwitch = ({ checked, onChange }) => (
  <div className="relative inline-block w-11 h-6 align-middle select-none">
    <input
      type="checkbox" checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer top-0.5 transition-all duration-300"
      style={{ right: checked ? '2px' : 'calc(100% - 22px)', borderColor: checked ? '#10B981' : '#E5E7EB' }}
    />
    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${checked ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
  </div>
);
