import { X } from 'lucide-react';
import ProfileView from './views/ProfileView';

export default function ProfileModal({ open, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[85vh] animate-zoom-in">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800 shrink-0">
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Account</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <ProfileView onBack={onClose} />
                </div>
            </div>
        </div>
    );
}
