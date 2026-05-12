import { useState } from 'react';
import { Logo } from './Logo';
import { Icons } from '../ui/Icons';
export const Header = ({ view, isDark, toggleTheme, lowStockCount, onSupport }) => {
  const [showNotif, setShowNotif] = useState(false);
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
      <div className="md:hidden"><Logo /></div>
      <div className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">{view.replace('-',' ')}</div>
      <div className="flex items-center gap-4">
        <button onClick={onSupport} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition" title="Support"><Icons.Phone /></button>
        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition">{isDark ? '☀️' : '🌙'}</button>
        <div className="relative">
          <button onClick={() => setShowNotif(p=>!p)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition relative">
            <Icons.Bell />
            {lowStockCount>0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900" />}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xl z-50 fade-in overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-slate-800 font-bold text-xs bg-gray-50 dark:bg-slate-950">Notifications</div>
              <div className="max-h-60 overflow-y-auto">
                {lowStockCount>0 ? (
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer border-l-4 border-red-500">
                    <div className="text-xs font-bold text-red-500">Low Stock Alert</div>
                    <div className="text-[10px] text-gray-500 mt-1">{lowStockCount} items are running low.</div>
                  </div>
                ) : <div className="p-4 text-center text-xs text-gray-400">No new notifications.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
