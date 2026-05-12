import { Logo } from './Logo';
export const Sidebar = ({ view, setView, vendor, onLogout, navItems }) => (
  <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 z-30 shadow-2xl">
    <div className="p-6"><Logo /></div>
    <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar py-4">
      {navItems.map(item => (
        <button key={item.id} onClick={() => !item.disabled && setView(item.id)}
          disabled={!!item.disabled}
          title={item.disabled ? (item.disabledReason || 'Locked') : undefined}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-extrabold tracking-wide uppercase transition-all duration-300 ${
            view===item.id
              ? 'bg-[#0ceded] text-black shadow-lg shadow-cyan-500/20 transform scale-105'
              : item.disabled
                ? 'text-gray-500 cursor-not-allowed opacity-70'
                : 'text-white hover:bg-white/10 hover:pl-6'}`}>
          <span className="text-lg">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {item.disabled && <span className="text-[10px] text-yellow-300">LOCKED</span>}
        </button>
      ))}
    </nav>
    <div className="p-4 border-t border-slate-800 mt-auto">
      <div className="bg-slate-800/50 p-3 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0ceded] flex items-center justify-center font-bold text-black text-sm">
          {vendor?.shopName ? vendor.shopName[0].toUpperCase() : 'V'}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-xs font-bold text-white truncate">{vendor?.shopName||'Vendor Hub'}</div>
          <div className="text-[10px] text-gray-400 truncate">{vendor?.ownerName||'User'}</div>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition p-2" title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </div>
  </aside>
);
