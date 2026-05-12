import { useState } from 'react';
import { Heart as HeartIcon, Trash2, Folder, ChevronDown, ChevronUp, ShoppingBag, FolderPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { hardware } from '../../data/products';

export default function WishlistView({ liveProducts = [], openProduct, isPage = false, onBack }) {
    const { userData, toggleWishlist, removeFromWishlistFolder, deleteWishlistFolder, createWishlistFolder } = useAuth();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [expandedFolders, setExpandedFolders] = useState({});
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const allProducts = [...hardware, ...liveProducts];

    // Helper to get full product objects from an array of IDs
    const resolveItems = (ids) => (Array.isArray(ids) ? ids : []).map(id => allProducts.find(p => String(p.id) === String(id))).filter(Boolean);

    const unassignedItems = resolveItems(userData.wishlist || []);
    const folders = userData.wishlistFolders || [];

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    const handleOrderAll = (e, folder) => {
        e.stopPropagation();
        const items = resolveItems(folder.items);
        if (items.length === 0) return showToast('Folder is empty!');

        items.forEach(item => {
            const price = Number(item.selling_price || item.price) || 0;
            addToCart({ id: item.id, name: item.name, price, img: item.img || item.images?.[0] || '', tier: item.tier || 1 });
        });
        showToast(`Added ${items.length} items to cart!`);
    };

    const handleCreateFolder = (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        createWishlistFolder(newFolderName.trim());
        setNewFolderName('');
        setIsCreating(false);
        showToast(`Created folder "${newFolderName.trim()}"`);
    };

    const renderItemCard = (item, folderId = null) => (
        <div key={`${folderId || 'unassigned'}-${item.id}`} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl transition-all hover:border-cyan-200 dark:hover:border-cyan-800 hover:shadow-sm cursor-pointer group" onClick={() => {
            openProduct(item, 'wishlist');
        }}>
            <img src={item.img || item.images?.[0] || ''} className="w-14 h-14 object-contain rounded-lg bg-gray-50 dark:bg-slate-800 p-1 transition-transform group-hover:scale-105" />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px] dark:text-white truncate group-hover:text-cyan-600 transition-colors">{item.name}</p>
                <p className="text-sm font-bold text-cyan-600">₹{(item.price || item.selling_price || 0).toLocaleString('en-IN')}</p>
            </div>
            <button onClick={(e) => {
                e.stopPropagation();
                if (folderId) {
                    removeFromWishlistFolder(folderId, item.id);
                } else {
                    toggleWishlist(item.id);
                }
            }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full z-10 transition-colors">
                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 hover:text-red-600" />
            </button>
        </div>
    );

    const isCompletelyEmpty = unassignedItems.length === 0 && folders.length === 0;

    return (
        <div className={`flex flex-col h-full min-h-screen ${isPage ? 'bg-gray-50 dark:bg-slate-950 pb-24' : ''}`}>
            {/* Header for Page View */}
            {isPage && (
                <div className="px-4 py-3 flex items-center gap-4 sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shrink-0">
                    <button onClick={onBack} className="p-1 -ml-1"><ArrowLeft className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">My Wishlist</h1>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar ${!isPage ? 'bg-gray-50/50 dark:bg-slate-950/50' : ''}`}>
                {/* Create Folder Top Bar */}
                <div className="flex items-center justify-between mb-4">
                    {isCreating ? (
                        <form onSubmit={handleCreateFolder} className="flex gap-2 w-full">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder Name..."
                                className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-cyan-500 dark:text-white"
                            />
                            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                Save
                            </button>
                            <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                                Cancel
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-slate-600 text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors"
                        >
                            <FolderPlus className="w-5 h-5" /> Create New Folder
                        </button>
                    )}
                </div>

                {isCompletelyEmpty ? (
                    <div className="text-center py-16 text-gray-400">
                        <HeartIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="font-black text-xl text-gray-800 dark:text-gray-300 mb-1">Your wishlist is empty</h3>
                        <p className="text-sm font-medium">Save items you love to review them later.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {folders.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Folders</h3>
                                {folders.map(folder => {
                                    const isExpanded = expandedFolders[folder.id];
                                    const folderItems = resolveItems(folder.items);
                                    return (
                                        <div key={folder.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                                            <div onClick={() => toggleFolder(folder.id)} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors select-none group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                                                        <Folder className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{folder.name}</h4>
                                                        <p className="text-xs font-bold text-gray-400">{folderItems.length} items</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:ml-auto">
                                                    <button onClick={(e) => { e.stopPropagation(); deleteWishlistFolder(folder.id); }} className="p-2 sm:opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    <button onClick={(e) => handleOrderAll(e, folder)} disabled={folderItems.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"><ShoppingBag className="w-3.5 h-3.5" /> Order All</button>
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 transition-colors shrink-0">{isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />}</div>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="p-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 grid gap-2 animate-fade-in">
                                                    {folderItems.length === 0 ? <div className="text-center py-4 text-xs font-bold text-gray-400">Empty folder</div> : folderItems.map(item => renderItemCard(item, folder.id))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {unassignedItems.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Uncategorized</h3>
                                <div className="grid gap-2">{unassignedItems.map(item => renderItemCard(item))}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
