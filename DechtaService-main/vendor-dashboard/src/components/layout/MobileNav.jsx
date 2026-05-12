export const MobileNav = ({ view, setView, navItems }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
    {navItems.slice(0,6).map(item => (
      <button key={item.id} onClick={() => !item.disabled && setView(item.id)}
        disabled={!!item.disabled}
        title={item.disabled ? (item.disabledReason || 'Locked') : undefined}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition w-full ${view===item.id ? 'text-[#0ceded] bg-[#0ceded]/10' : item.disabled ? 'text-gray-500 opacity-70' : 'text-white'}`}>
        {item.icon}
        <span className="text-[9px] font-extrabold mt-1 uppercase tracking-tight">{item.label}</span>
      </button>
    ))}
  </div>
);
