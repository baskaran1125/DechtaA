import { useEffect, useState } from 'react';
import { X, ShoppingCart, Zap, Plus, Minus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function CartNotification({ item, onClose, onViewCart, onBuyNow }) {
    const { cart, updateQty } = useCart();
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (!item) {
            setIsVisible(false);
            return;
        }
        // Slide in
        requestAnimationFrame(() => setIsVisible(true));
        // Auto-dismiss after 4s
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 4000);
        return () => clearTimeout(timer);
    }, [item, onClose]);

    if (!item) return null;

    const qty = cart[item.id]?.qty || 1;
    const price = Number(item.price || item.selling_price || 0);
    const img = Array.isArray(item.images) && item.images[0] ? item.images[0] : (item.img || 'https://via.placeholder.com/80');

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    // ── Mobile: Bottom card ──────────────────────────────────
    if (isMobile) {
        return (
            <div
                className={`fixed bottom-[70px] left-3 right-3 z-[160] transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                    }`}
            >
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                    {/* Success accent */}
                    <div className="h-1 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

                    <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Added to Cart</span>
                            </div>
                            <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        </div>

                        {/* Product row */}
                        <div className="flex items-center gap-3 mb-3">
                            <img src={img} className="w-14 h-14 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 p-1.5 border border-gray-100 dark:border-slate-700 shrink-0" alt={item.name} />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                                <p className="text-xs text-gray-400 capitalize mt-0.5">{item.category || 'Product'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-black text-base text-gray-900 dark:text-white">₹{(price * qty).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {/* Quantity + Actions */}
                        <div className="flex items-center gap-2">
                            {/* Qty controls */}
                            <div className="flex items-center h-9 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0">
                                <button onClick={() => updateQty(item.id, -1)} className="w-9 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                    <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                </button>
                                <span className="w-8 text-center font-bold text-sm text-gray-900 dark:text-white">{qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-9 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                    <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                </button>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => { handleClose(); onViewCart?.(); }}
                                className="flex-1 h-9 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" /> View Cart
                            </button>
                            <button
                                onClick={() => { handleClose(); onBuyNow?.(item); }}
                                className="flex-1 h-9 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:from-cyan-600 hover:to-teal-600 transition-all shadow-sm"
                            >
                                <Zap className="w-3.5 h-3.5" /> Buy Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Desktop: Right-side card ─────────────────────────────
    return (
        <div
            className={`fixed top-24 right-6 z-[160] w-[360px] transition-all duration-300 ease-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                {/* Success accent */}
                <div className="h-1 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">Added to Cart</span>
                        </div>
                        <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Product */}
                    <div className="flex items-center gap-4 mb-4">
                        <img src={img} className="w-16 h-16 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 p-2 border border-gray-100 dark:border-slate-700 shrink-0" alt={item.name} />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-xs text-gray-400 capitalize mt-0.5">{item.category || 'Product'}</p>
                            <p className="font-black text-lg text-gray-900 dark:text-white mt-1">₹{price.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</span>
                        <div className="flex items-center h-9 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                            <button onClick={() => updateQty(item.id, -1)} className="w-9 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="w-10 text-center font-bold text-sm text-gray-900 dark:text-white">{qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-9 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { handleClose(); onViewCart?.(); }}
                            className="flex-1 h-11 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" /> View Cart
                        </button>
                        <button
                            onClick={() => { handleClose(); onBuyNow?.(item); }}
                            className="flex-1 h-11 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <Zap className="w-4 h-4" /> Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
