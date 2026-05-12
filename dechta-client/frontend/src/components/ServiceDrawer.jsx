import { X, ShoppingCart, Star } from 'lucide-react';
import { serviceData } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

export default function ServiceDrawer({ open, serviceKey, onClose, onViewCart }) {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const data = serviceKey ? serviceData[serviceKey] : null;
    if (!open || !data) return null;

    const handleAdd = (item) => {
        addToCart({ id: item.id, name: item.name, price: item.price, img: 'https://cdn.pixabay.com/photo/2024/05/20/17/25/construction-8775840_1280.png', tier: 1 });
        showToast(`${item.name} added`);
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-black dark:text-white">{data.title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
                </div>
                {data.features && (
                    <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-gray-100 dark:border-slate-800">
                        {data.features.map((f, i) => (
                            <span key={i} className="px-3 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3" />{f}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {data.items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-bold text-sm dark:text-white">{item.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                                <p className="text-sm font-black mt-2 dark:text-white">₹{item.price}</p>
                            </div>
                            <button onClick={() => handleAdd(item)} className="h-8 px-4 bg-cyan-50 dark:bg-slate-700 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 rounded-lg text-xs font-bold uppercase hover:bg-cyan-100 transition-all">ADD</button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                    <button onClick={onViewCart} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> View Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
