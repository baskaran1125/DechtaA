import { useState, useEffect } from 'react';
import { X, MessageCircle, PhoneCall, Phone, HardHat } from 'lucide-react';

export default function EstimateConsultantWidget({ onOpenModal }) {
    const [isVisible, setIsVisible] = useState(false);
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);
    const [messages] = useState([
        "👋 Hi! I am your Estimate Consultant.",
        "👷 I will estimate for your work.",
        "📞 Click me to get a Quote!"
    ]);

    useEffect(() => {
        // Slide up animation trigger
        const timer1 = setTimeout(() => setIsVisible(true), 2000);
        // Bubble pop up trigger
        const timer2 = setTimeout(() => setBubbleVisible(true), 3000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    useEffect(() => {
        if (!bubbleVisible) return;

        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % messages.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [bubbleVisible, messages.length]);

    const handleDismissBubble = (e) => {
        e.stopPropagation();
        setBubbleVisible(false);
    };

    return (
        <div className="fixed bottom-16 md:bottom-0 right-2 md:right-8 z-[150] flex flex-col items-end pointer-events-none">

            <div className={`mr-4 mb-2 bg-white dark:bg-slate-800 text-black dark:text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-2xl border border-gray-100 dark:border-slate-700 max-w-[180px] origin-bottom-right transition-all duration-500 relative ${bubbleVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                <p className="text-xs font-bold leading-relaxed transition-opacity duration-300">
                    {messages[messageIndex]}
                </p>

                <div className="absolute -bottom-2 right-0 w-4 h-4 bg-white dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-700 transform rotate-45"></div>

                <button onClick={handleDismissBubble} className="absolute -top-2 -left-2 bg-gray-200 text-gray-500 rounded-full p-0.5 pointer-events-auto hover:bg-red-500 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div onClick={onOpenModal} className="relative cursor-pointer group pointer-events-auto transition-transform hover:scale-105 active:scale-95">

                <div className="absolute top-0 right-0 z-20 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>

                <img src="https://www.pngall.com/wp-content/uploads/14/Saul-Goodman-PNG-Picture.png"
                    className={`w-24 md:w-28 h-auto object-contain drop-shadow-2xl transition-transform duration-1000 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-[120%]'}`}
                    alt="Estimate Consultant" />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Click to Call
                </div>
            </div>

        </div>
    );
}
