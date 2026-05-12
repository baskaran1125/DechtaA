import { useState, useEffect } from 'react';

export default function LoadingScreen() {
    const [text, setText] = useState('Loading...');
    useEffect(() => {
        const texts = ['Loading...', 'Preparing tools...', 'Almost ready...'];
        let i = 0;

        const progress = document.getElementById('loader-progress');
        if (progress) {
            progress.style.transition = 'width 3s ease-in-out';
            progress.style.width = '100%';
        }

        // Just use a basic timeout instead of intervals to avoid any re-rendering issues 
        // that could be causing StrictMode to glitch the CSS animations
        const timer1 = setTimeout(() => setText(texts[1]), 1200);
        const timer2 = setTimeout(() => setText(texts[2]), 2400);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
            <div className="relative w-[360px] h-[240px] mb-8 flex items-end justify-center overflow-hidden">
                {/* Truck SVG */}
                <svg id="loader-truck" viewBox="0 0 200 120" className="absolute bottom-0 left-[-220px] w-52 h-32 z-30 drop-shadow-xl will-change-transform">
                    <rect x="20" y="80" width="120" height="15" rx="2" fill="#334155" />
                    <g className="animate-tire-spin" style={{ transformOrigin: '45px 105px' }}>
                        <circle cx="45" cy="105" r="14" fill="#1e293b" stroke="#475569" strokeWidth="4" />
                        <circle cx="45" cy="105" r="5" fill="#94a3b8" />
                    </g>
                    <g className="animate-tire-spin" style={{ transformOrigin: '115px 105px' }}>
                        <circle cx="115" cy="105" r="14" fill="#1e293b" stroke="#475569" strokeWidth="4" />
                        <circle cx="115" cy="105" r="5" fill="#94a3b8" />
                    </g>
                    <path d="M120 80 L120 45 L145 45 L160 65 L160 80 Z" fill="#facc15" />
                    <path d="M145 50 L155 65 L145 65 Z" fill="#334155" opacity="0.8" />
                    <g id="truck-bed" style={{ transformOrigin: '30px 80px' }}>
                        <path d="M10 40 L110 40 L100 80 L20 80 Z" fill="#eab308" />
                        <rect x="15" y="35" width="90" height="5" fill="#ca8a04" />
                    </g>
                </svg>

                {/* Materials Pile SVG */}
                <svg id="loader-pile" viewBox="0 0 100 60" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-20 z-20 opacity-0 origin-bottom">
                    <rect x="20" y="45" width="15" height="8" fill="#ef4444" rx="1" />
                    <rect x="38" y="45" width="15" height="8" fill="#f97316" rx="1" />
                    <rect x="56" y="45" width="15" height="8" fill="#ef4444" rx="1" />
                    <rect x="28" y="35" width="15" height="8" fill="#f97316" rx="1" />
                    <rect x="46" y="35" width="15" height="8" fill="#ef4444" rx="1" />
                    <rect x="37" y="25" width="15" height="8" fill="#f97316" rx="1" />
                </svg>

                {/* Workers SVG Container tightly wrapping the center pile */}
                <div id="loader-workers" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-28 z-40 opacity-0 flex justify-between items-end px-0">
                    <svg className="w-16 h-20 overflow-visible" viewBox="0 0 50 80">
                        <g className="animate-hammer-left" style={{ transformOrigin: '35px 35px' }}>
                            <rect x="25" y="30" width="20" height="6" fill="#fca5a5" transform="rotate(-20)" rx="2" />
                            <rect x="40" y="20" width="6" height="20" fill="#475569" transform="rotate(-10)" />
                            <rect x="35" y="18" width="16" height="8" fill="#1e293b" transform="rotate(-10)" />
                        </g>
                        <path d="M15 80 L15 40 Q15 30 25 30 Q35 30 35 40 L35 80 Z" fill="#2563eb" />
                        <circle cx="25" cy="20" r="10" fill="#fca5a5" />
                        <path d="M13 18 Q25 5 37 18" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                    </svg>

                    <svg className="w-16 h-20 overflow-visible" viewBox="0 0 50 80">
                        <g className="animate-hammer-right" style={{ transformOrigin: '15px 35px' }}>
                            <rect x="5" y="30" width="20" height="6" fill="#fca5a5" transform="rotate(20)" rx="2" />
                            <rect x="0" y="20" width="6" height="20" fill="#475569" transform="rotate(10)" />
                            <rect x="-5" y="18" width="16" height="8" fill="#1e293b" transform="rotate(10)" />
                        </g>
                        <path d="M15 80 L15 40 Q15 30 25 30 Q35 30 35 40 L35 80 Z" fill="#f97316" />
                        <circle cx="25" cy="20" r="10" fill="#fca5a5" />
                        <path d="M13 18 Q25 5 37 18" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                </div>

                {/* Logo Overlay */}
                <div id="loader-logo" className="absolute inset-0 flex flex-col items-center justify-center opacity-0 scale-90 z-50 pointer-events-none">
                    <img src="/dechta.png" className="w-56 h-56 object-contain mb-4 animate-pulse-slow" alt="Dechta Logo" />
                </div>
            </div>

            {/* Progress Bar & Text */}
            <div className="w-64 h-1 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div id="loader-progress" className="absolute top-0 left-0 h-full bg-cyan-500 w-0"></div>
            </div>
            <div className="mt-4 flex flex-col items-center h-6 overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">{text}</p>
            </div>
        </div>
    );
}
