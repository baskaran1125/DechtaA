import { useState } from 'react';
import { X, FolderPlus, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function FolderSelectModal({ open, onClose, product }) {
    const { userData, createWishlistFolder, addToWishlistFolder, toggleWishlist } = useAuth();
    const { showToast } = useToast();
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!open || !product) return null;

    const folders = userData.wishlistFolders || [];
    const mainWishlist = Array.isArray(userData.wishlist) ? userData.wishlist : [];

    const handleSelectFolder = (folderId, folderName) => {
        addToWishlistFolder(folderId, product.id);
        showToast(`Saved to ${folderName}`);
        onClose();
    };

    const handleSaveUnassigned = () => {
        // Only toggle if it's not already in the main wishlist
        if (!mainWishlist.includes(product.id)) {
            toggleWishlist(product.id);
        }
        showToast('Saved to Wishlist');
        onClose();
    };

    const handleCreateFolder = (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        createWishlistFolder(newFolderName.trim());
        setNewFolderName('');
        setIsCreating(false);
        showToast(`Created folder "${newFolderName.trim()}"`);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-slide-up sm:animate-zoom-in">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">Save to...</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {folders.map(folder => {
                        const folderItems = Array.isArray(folder.items) ? folder.items : [];
                        const isSaved = folderItems.includes(product.id);
                        return (
                            <button
                                key={folder.id}
                                onClick={() => !isSaved && handleSelectFolder(folder.id, folder.name)}
                                disabled={isSaved}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSaved ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800 opacity-60' : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md'}`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSaved ? 'bg-cyan-100 dark:bg-cyan-900' : 'bg-gray-100 dark:bg-slate-800'}`}>
                                    <Folder className={`w-5 h-5 ${isSaved ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-sm dark:text-white">{folder.name}</div>
                                    <div className="text-xs text-gray-500">{folderItems.length} items</div>
                                </div>
                                {isSaved && <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Saved</span>}
                            </button>
                        );
                    })}

                    <button
                        onClick={handleSaveUnassigned}
                        disabled={mainWishlist.includes(product.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${mainWishlist.includes(product.id) ? 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 opacity-60' : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600'}`}
                    >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                            <Folder className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-sm dark:text-white">Default Wishlist</div>
                            <div className="text-xs text-gray-500">Uncategorized items</div>
                        </div>
                        {mainWishlist.includes(product.id) && <span className="text-xs font-bold text-gray-500">Saved</span>}
                    </button>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    {isCreating ? (
                        <form onSubmit={handleCreateFolder} className="flex gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder Name..."
                                className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-cyan-500 dark:text-white"
                            />
                            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                Create
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg font-bold text-sm transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" /> New Folder
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
