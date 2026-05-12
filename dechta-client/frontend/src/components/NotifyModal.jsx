import { useState, useRef, useEffect } from 'react';
import { X, Bell, Mail, Phone } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function NotifyModal({ open, onClose, product }) {
    const { showToast } = useToast();
    const [contact, setContact] = useState('');
    const [contactType, setContactType] = useState('email'); // 'email' or 'phone'
    const submitTimerRef = useRef(null);

    // Clear submit timer on modal close
    useEffect(() => {
        return () => {
            if (submitTimerRef.current) {
                clearTimeout(submitTimerRef.current);
            }
        };
    }, []);

    if (!open || !product) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!contact.trim()) {
            showToast('Please enter your contact detail', 'error');
            return;
        }

        // Clear any pending submit timer
        if (submitTimerRef.current) {
            clearTimeout(submitTimerRef.current);
        }

        // Simulate API call to register notification
        submitTimerRef.current = setTimeout(() => {
            showToast(`We will notify you when ${product.name} is back in stock!`, 'success');
            setContact('');
            onClose();
            submitTimerRef.current = null;
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in touch-none">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up-modal border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-cyan-500" />
                        Notify Me
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto hide-scroll flex flex-col gap-6 relative">
                    {/* Animated background element */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-100/50 dark:bg-cyan-900/10 rounded-full blur-[40px] pointer-events-none z-0"></div>

                    <div className="text-center relative z-10">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-2xl mx-auto mb-4 p-3 flex items-center justify-center">
                            <img src={product.img || product.images?.[0] || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">{product.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Leave your contact details and we'll alert you the moment this item is restocked.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                        {/* Contact Type Toggle */}
                        <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setContactType('email')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${contactType === 'email' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Mail className="w-4 h-4" /> Email
                            </button>
                            <button
                                type="button"
                                onClick={() => setContactType('phone')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${contactType === 'phone' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Phone className="w-4 h-4" /> Phone
                            </button>
                        </div>

                        {/* Input Field */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                                {contactType === 'email' ? 'Email Address' : 'Phone Number'}
                            </label>
                            <input
                                type={contactType === 'email' ? 'email' : 'tel'}
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                placeholder={contactType === 'email' ? "Enter your email" : "Enter your mobile number"}
                                className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all dark:text-white"
                                required
                            />
                        </div>

                        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl py-3.5 mt-2 transition-all active:scale-95 shadow-lg shadow-cyan-600/20">
                            Notify When Available
                        </button>
                    </form>
                </div>
            </div >
        </div >
    );
}
