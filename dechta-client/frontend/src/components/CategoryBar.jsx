export default function CategoryBar({ activeCategory, setCategory }) {
    const cats = [
        { key: 'all', label: 'All', bg: 'bg-blue-50 dark:bg-slate-800', border: 'border-blue-100 dark:border-slate-700', icon: 'https://static.vecteezy.com/system/resources/thumbnails/028/233/951/small_2x/truck-3d-rendering-icon-illustration-free-png.png' },
        { key: 'hardware', label: 'Hardware', bg: 'bg-purple-50 dark:bg-slate-800', border: 'border-purple-100 dark:border-slate-700', icon: 'https://cdn-icons-png.flaticon.com/512/4851/4851562.png' },
        { key: 'hire', label: 'Hire Workers', bg: 'bg-orange-50 dark:bg-slate-800', border: 'border-orange-100 dark:border-slate-700', icon: 'https://png.pngtree.com/png-vector/20241109/ourmid/pngtree-bearded-cartoon-construction-worker-with-safety-gear-png-image_14332182.png' },
        { key: 'services', label: 'Interiors', bg: 'bg-green-50 dark:bg-slate-800', border: 'border-green-100 dark:border-slate-700', icon: 'https://cdn-icons-png.flaticon.com/512/3068/3068015.png' },
    ];
    return (
        <div className="fixed top-16 lg:top-20 left-0 w-full bg-cyan-400 z-30 transition-all duration-300 shadow-none border-none py-2 md:pb-2">
            <div className="max-w-7xl mx-auto px-2 lg:px-4">
                <div className="flex justify-between md:justify-start items-start md:items-center gap-1 md:gap-3 w-full px-1 md:px-0 mt-1 md:mt-0">
                    {cats.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                            className={`category-btn flex flex-col md:flex-row items-center justify-start md:justify-center gap-1.5 md:gap-2 p-1.5 md:p-1 md:pr-4 rounded-xl md:rounded-full transition-all group border border-transparent ${activeCategory === c.key ? 'active-cat bg-white shadow-md rounded-2xl md:rounded-full' : 'hover:bg-gray-50/20'} flex-1 md:flex-none`}>
                            <div className={`icon-box w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-full ${c.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border ${c.border} shadow-sm md:shadow-none bg-white`}>
                                <img src={c.icon} className="w-6 h-6 md:w-5 md:h-5 object-contain drop-shadow-sm" alt={c.label} />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-center text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white leading-[1.1] md:whitespace-nowrap px-1 max-w-[75px] md:max-w-none">{c.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
