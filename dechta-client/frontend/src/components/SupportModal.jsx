import { X, MessageCircle, Phone, Mail, HelpCircle } from 'lucide-react';

export default function SupportModal({ open, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black dark:text-white">Support</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-3">
                    {[
                        { icon: <MessageCircle className="w-5 h-5 text-blue-500" />, title: 'Live Chat', desc: 'Chat with our team' },
                        { icon: <Phone className="w-5 h-5 text-green-500" />, title: 'Call Us', desc: '+91 98765 43210' },
                        { icon: <Mail className="w-5 h-5 text-purple-500" />, title: 'Email', desc: 'support@dechta.com' },
                        { icon: <HelpCircle className="w-5 h-5 text-orange-500" />, title: 'FAQs', desc: 'Browse common questions' }
                    ].map((item, i) => (
                        <button key={i} className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            {item.icon}<div className="text-left"><p className="font-bold text-sm dark:text-white">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
