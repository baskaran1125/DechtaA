import { useEffect } from 'react';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessModal({ open, bookingId, onClose }) {
    useEffect(() => {
        if (open) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0CEDED', '#0F172A', '#22C55E'] });
        }
    }, [open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[230]">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center max-w-sm mx-4 animate-bounce-in relative overflow-hidden">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 relative z-10 dark:text-white">Order Placed!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 relative z-10">
                        Booking ID: #QC{bookingId || '0000'}<br />Technician will arrive at selected time.
                    </p>
                    <button onClick={onClose} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold relative z-10 hover:scale-105 transition-transform">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
