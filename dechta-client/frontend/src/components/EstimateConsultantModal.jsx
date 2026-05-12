import { X, PhoneCall, Phone, MessageCircle } from 'lucide-react';

export default function EstimateConsultantModal({ open, onClose, onOpenChat }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-900 w-[90%] max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-gray-100 dark:border-slate-800 transition-all duration-300 relative z-10 animate-bounce-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/40 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-800 shadow-lg">
                    <PhoneCall className="w-8 h-8 text-black dark:text-cyan-400" />
                </div>

                <h3 className="text-xl font-bold dark:text-white mb-2">Estimate Consultant</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Connect with our expert for a quick quote.</p>

                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-xl mb-6 flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Direct Line</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white tracking-wide select-all">+91 86080 54350</span>
                </div>

                <div className="flex gap-3 w-full">
                    <a href="tel:+918608054350" className="flex-1 flex items-center justify-center gap-2 bg-cyan-400 text-black py-3.5 rounded-xl font-bold hover:bg-cyan-300 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                        <Phone className="w-4 h-4 fill-current" /> Call
                    </a>
                    <button onClick={onOpenChat} className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                        <MessageCircle className="w-4 h-4" /> Chat
                    </button>
                </div>
            </div>
        </div>
    );
}
