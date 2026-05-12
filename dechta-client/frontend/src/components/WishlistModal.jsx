import { X, Heart as HeartIcon } from 'lucide-react';
import WishlistView from './views/WishlistView';

export default function WishlistModal({ open, onClose, liveProducts = [], openProduct }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-zoom-in">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800 shrink-0">
                    <h2 className="text-xl font-black dark:text-white flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-cyan-500 fill-cyan-500" /> My Wishlist
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <WishlistView liveProducts={liveProducts} openProduct={(item) => { openProduct(item); onClose(); }} />
                </div>
            </div>
        </div>
    );
}
