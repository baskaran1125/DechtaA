import { useEffect, useRef, useState } from 'react';
import { Instagram, Twitter, ShieldCheck, MapPin, Star, Check, Search, ChevronDown, Bell, ArrowRight } from 'lucide-react';

export default function Footer({ onOpenDrawer, onOpenHireMap, onPrivacyClick }) {
    const phoneContentRef = useRef(null);
    const laptopContentRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isLaptopHovered, setIsLaptopHovered] = useState(false);

    // Seamless Auto-scroll logic for mockups
    useEffect(() => {
        const phoneEl = phoneContentRef.current;
        const laptopEl = laptopContentRef.current;

        const interval = setInterval(() => {
            if (phoneEl && !isHovered) {
                // Seamless loop: if we reached the end of the first copy, jump back to start
                if (phoneEl.scrollTop >= phoneEl.scrollHeight / 2) {
                    phoneEl.scrollTop = 0;
                } else {
                    phoneEl.scrollTop += 0.8;
                }
            }
            if (laptopEl && !isLaptopHovered) {
                if (laptopEl.scrollTop >= laptopEl.scrollHeight / 2) {
                    laptopEl.scrollTop = 0;
                } else {
                    laptopEl.scrollTop += 0.6;
                }
            }
        }, 16); 

        return () => clearInterval(interval);
    }, [isHovered, isLaptopHovered]);

    // Animation helper for content duplication
    const renderMockContent = (isPhone = true) => {
        const content = (
            <div className="pb-8 bg-white dark:bg-slate-950">
                {isPhone ? (
                    <>
                        {/* EXACT APP HEADER - MOBILE */}
                        <div className="px-4 pt-10 pb-4 bg-cyan-400 sticky top-0 z-30 flex flex-col gap-3 shadow-md">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-800 uppercase tracking-tighter">
                                        <MapPin className="w-2.5 h-2.5" /> Current Location
                                    </div>
                                    <div className="flex items-center gap-1 font-black text-[11px] text-gray-950">
                                        Anna Nagar <ChevronDown className="w-3 h-3" />
                                    </div>
                                </div>
                                <div className="flex gap-2.5">
                                    <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm"><Bell className="w-4 h-4 text-gray-900" /></div>
                                    <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">0</div>
                                </div>
                            </div>
                            <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl h-10 flex items-center px-4 gap-3 shadow-inner border border-white/50">
                                <Search className="w-4 h-4 text-gray-400" />
                                <span className="text-[10px] text-gray-400 font-medium italic">Search for AC Repair...</span>
                            </div>
                        </div>

                        {/* CATEGORY BAR */}
                        <div className="flex justify-between px-3 py-4 bg-cyan-400 mb-4 shadow-lg">
                            {[
                                { label: 'All', icon: 'https://static.vecteezy.com/system/resources/thumbnails/028/233/951/small_2x/truck-3d-rendering-icon-illustration-free-png.png' },
                                { label: 'Hardware', icon: 'https://cdn-icons-png.flaticon.com/512/4851/4851562.png' },
                                { label: 'Workers', icon: 'https://png.pngtree.com/png-vector/20241109/ourmid/pngtree-bearded-cartoon-construction-worker-with-safety-gear-png-image_14332182.png' },
                                { label: 'Interiors', icon: 'https://cdn-icons-png.flaticon.com/512/3068/3068015.png' },
                            ].map((c, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md transform rotate-3">
                                        <img src={c.icon} className="w-8 h-8 object-contain" alt={c.label} />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-900 text-center uppercase tracking-tighter">{c.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Hero Section */}
                        <div className="grid grid-cols-2 gap-3 px-4 mb-6">
                            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 h-28 relative overflow-hidden shadow-lg border border-gray-100/50">
                                <div className="relative z-10 flex flex-col justify-start pt-2 items-start gap-1">
                                    <h4 className="text-[10px] font-black leading-none text-gray-950 uppercase tracking-tighter">HIRE<br/>WORKERS</h4>
                                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center mt-4">
                                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>
                                <img src="https://png.pngtree.com/png-vector/20241109/ourmid/pngtree-bearded-cartoon-construction-worker-with-safety-gear-png-image_14332182.png" className="absolute -bottom-1 -right-1 w-16 h-16 object-contain drop-shadow-xl" />
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 h-28 relative overflow-hidden shadow-lg border border-gray-100/50">
                                <div className="relative z-10 flex flex-col justify-start pt-2 items-start gap-1">
                                    <h4 className="text-[10px] font-black leading-none text-gray-950 uppercase tracking-tighter">HARDWARE<br/>STORE</h4>
                                    <div className="bg-cyan-500/10 text-cyan-600 text-[6px] font-black px-1.5 py-0.5 rounded-full border border-cyan-500/20 uppercase">Pro Access</div>
                                </div>
                                <img src="https://cdn-icons-png.flaticon.com/512/4851/4851562.png" className="absolute bottom-1 right-0 w-14 h-14 object-contain drop-shadow-xl" />
                            </div>
                        </div>

                        {/* Store Section */}
                        <div className="px-4 mb-6">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[11px] font-black uppercase text-gray-800 tracking-wider">Top Sellers</span>
                                <span className="text-[8px] font-bold text-cyan-600 border-b border-cyan-300">View All</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { name: 'Drill Machine', price: '2,499', img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200' },
                                    { name: 'Red Bricks', price: '7,500', img: 'https://png.pngtree.com/png-vector/20240920/ourmid/pngtree-construction-equipment-png-image_13880417.png' },
                                    { name: 'Safety Kit', price: '1,200', img: 'https://png.pngtree.com/png-vector/20241109/ourmid/pngtree-bearded-cartoon-construction-worker-with-safety-gear-png-image_14332182.png' },
                                    { name: 'Tool Kit', price: '3,899', img: 'https://cdn-icons-png.flaticon.com/512/4851/4851562.png' }
                                ].map((p, i) => (
                                    <div key={i} className="bg-gray-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-gray-100 shadow-sm transition-all">
                                        <div className="w-full aspect-square bg-white rounded-lg p-1.5 mb-2 flex items-center justify-center">
                                            <img src={p.img} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-[9px] font-black truncate text-gray-900">{p.name}</div>
                                        <div className="flex justify-between items-center mt-1.5">
                                            <span className="text-[10px] font-black text-gray-900 leading-none">₹{p.price}</span>
                                            <div className="w-5 h-5 bg-cyan-500 rounded-md flex items-center justify-center text-white text-[10px] font-black">+</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Banner */}
                        <div className="px-4 mb-8">
                            <div className="w-full h-24 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[1.5rem] p-4 relative overflow-hidden shadow-xl">
                                <div className="relative z-10 w-2/3">
                                    <div className="bg-white/20 text-white text-[7px] font-black px-2 py-0.5 rounded-full w-fit mb-1 border border-white/30 uppercase">Member Deal</div>
                                    <h3 className="text-[13px] font-black leading-tight text-white italic">FREE DELIVERY<br/>ON CEMENT</h3>
                                </div>
                                <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-28 h-28 bg-white/10 blur-[40px] rounded-full" />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* EXACT DESKTOP HEADER - LAPTOP VERSION */}
                        <div className="w-full bg-cyan-400 border-b border-gray-200/20 sticky top-0 z-50 shadow-md">
                            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-[14px] font-black italic text-gray-950 tracking-tighter">DECHTA</div>
                                    <div className="hidden sm:flex gap-4 text-[8px] font-black text-gray-950/80 uppercase tracking-widest">
                                        <span className="text-gray-950 underline underline-offset-4">Home</span>
                                        <span>Store</span>
                                        <span>Hire Workers</span>
                                        <span>Join Us</span>
                                    </div>
                                </div>
                                <div className="flex-1 max-w-[200px] h-8 bg-white/40 rounded-xl mx-8 flex items-center px-4 backdrop-blur-md">
                                    <Search className="w-3 h-3 text-gray-600" />
                                    <div className="ml-2 w-[1px] h-3 bg-gray-400/30" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black tracking-widest text-gray-800 uppercase">Cart</span>
                                        <span className="text-[8px] font-black text-gray-950 leading-none">₹0.00</span>
                                    </div>
                                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg relative">
                                        <Bell className="w-4 h-4 text-white" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-cyan-400 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DESKTOP HERO BANNER - WIDE */}
                        <div className="w-full h-44 bg-cyan-400 relative overflow-hidden flex items-center px-12 shadow-inner">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/20 to-transparent" />
                            <div className="z-10 max-w-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-[1px] w-8 bg-gray-950" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-950">Expert Construction</span>
                                </div>
                                <h1 className="text-[28px] font-black leading-[0.8] text-gray-950 italic uppercase tracking-tighter">BUILD YOUR<br/>VISION SMART</h1>
                                <div className="flex gap-3 mt-6">
                                    <button className="text-[8px] bg-black text-white px-5 py-2.5 rounded-lg font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Explore Store</button>
                                    <button className="text-[8px] bg-white text-black px-5 py-2.5 rounded-lg font-black uppercase tracking-widest shadow-sm border border-gray-100">Hire Workers</button>
                                </div>
                            </div>
                        </div>

                        {/* DESKTOP CONTENT GRID - MULTI-COLUMN */}
                        <div className="max-w-6xl mx-auto p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[14px] font-black text-gray-900 border-l-4 border-cyan-400 pl-4 uppercase italic">Featured Categories</h2>
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="grid grid-cols-4 gap-6">
                                {[
                                    { title: 'BRICKS & SAND', color: 'bg-orange-50', icon: '🏗️' },
                                    { title: 'POWER TOOLS', color: 'bg-blue-50', icon: '⚙️' },
                                    { title: 'MASONS', color: 'bg-yellow-50', icon: '👨‍🔧' },
                                    { title: 'INTERIOR DESIGN', color: 'bg-purple-50', icon: '📐' }
                                ].map((cat, i) => (
                                    <div key={i} className={`${cat.color} rounded-2xl p-6 h-36 flex flex-col justify-between border border-gray-100 hover:shadow-xl transition-all cursor-pointer group`}>
                                        <div className="text-2xl transform group-hover:scale-125 transition-all">{cat.icon}</div>
                                        <span className="text-[9px] font-black leading-none text-gray-900 uppercase tracking-tight">{cat.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DESKTOP PRODUCT STRIP */}
                        <div className="bg-gray-50 border-y border-gray-100 py-10 px-8">
                            <div className="max-w-6xl mx-auto flex gap-6 overflow-hidden">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="min-w-[180px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="aspect-square bg-gray-50 rounded-lg mb-4" />
                                        <div className="h-2 w-2/3 bg-gray-100 rounded mb-2" />
                                        <div className="h-2 w-1/2 bg-gray-50 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );

        return (
            <div className="flex flex-col">
                {content}
                {content} {/* Duplicate for seamless loop */}
            </div>
        );
    };

    // Mobile app section scroll-triggered animation
    useEffect(() => {
        const section = document.getElementById('mobile-app-section');
        if (!section) return;
        const leftEl = document.getElementById('mobile-text-left');
        const rightEl = document.getElementById('mobile-visual-right');
        if (!leftEl || !rightEl) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    leftEl.style.transition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
                    leftEl.style.transform = 'translateX(0)';
                    leftEl.style.opacity = '1';
                    setTimeout(() => {
                        rightEl.style.transition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
                        rightEl.style.transform = 'translateX(0)';
                        rightEl.style.opacity = '1';
                    }, 200);
                } else {
                    leftEl.style.transform = 'translateX(-50px)';
                    leftEl.style.opacity = '0';
                    rightEl.style.transform = 'translateX(50px)';
                    rightEl.style.opacity = '0';
                }
            });
        }, { threshold: 0.1 });

        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    return (
        <footer className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pt-16 pb-8 relative z-20">
            {/* ====== COMPACT EXPERIENCE SECTION ====== */}
            <section id="mobile-app-section" className="w-full py-12 md:py-20 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 z-0" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-row items-center justify-between gap-4 md:gap-16 relative z-10">
                    
                    {/* Left Text - Ultra Compact for Mobile */}
                    <div id="mobile-text-left" className="w-[60%] md:w-1/2 z-10 text-left" style={{ opacity: 0, transform: 'translateX(-50px)' }}>
                        <div className="md:hidden">
                            <span className="text-[#0CEDED] font-bold tracking-widest text-[8px] uppercase mb-1 block">MOBILE EXPERIENCE</span>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                                Your Construction App,<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">In Your Pocket.</span>
                            </h2>
                            <p className="text-[10px] text-gray-400 leading-tight mb-4">
                                Track workers live, order cement in seconds, and manage your entire project from anywhere.
                            </p>
                            <div className="flex gap-2">
                                <ShieldCheck className="w-3 h-3 text-green-500" />
                                <MapPin className="w-3 h-3 text-blue-500" />
                            </div>
                        </div>

                        <div className="hidden md:block">
                            <span className="text-[#0CEDED] font-bold tracking-widest text-[8px] uppercase mb-1 block">EXPERIENCE THE MOBILE APP</span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                                Your Construction App,<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">In Your Pocket.</span>
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                Track workers live, order cement in seconds, and manage your entire project from anywhere.
                            </p>
                        </div>
                    </div>

                    {/* Right - Mockups (Compact Side-by-Side) */}
                    <div id="mobile-visual-right" className="w-[40%] md:w-1/2 flex justify-end md:justify-center relative" style={{ opacity: 0, transform: 'translateX(50px)' }}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-200/20 to-blue-200/20 dark:from-blue-900/10 dark:to-cyan-900/10 blur-2xl rounded-full z-0" />
                        
                        {/* LAPTOP (Mobile side-by-side) */}
                        <div className="md:hidden relative z-10 w-full max-w-[160px] translate-x-2">
                            <div className="relative aspect-[16/10] bg-gray-900 rounded-t-lg p-1 shadow-xl border-t border-x border-gray-800">
                                <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden relative rounded-t-md">
                                    <div 
                                        ref={laptopContentRef}
                                        onMouseEnter={() => setIsLaptopHovered(true)}
                                        onMouseLeave={() => setIsLaptopHovered(false)}
                                        className="w-full h-full overflow-y-auto hide-scroll touch-pan-y"
                                    >
                                        {renderMockContent(false)}
                                    </div>
                                </div>
                            </div>
                            <div className="relative w-[110%] -left-[5%] h-1.5 bg-gray-800 rounded-b-md shadow-lg" />
                        </div>

                        {/* PHONE (Desktop view) */}
                        <div className="hidden md:block relative z-10 w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-2.5 shadow-2xl border-4 border-gray-800 transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
                            <div className="w-full h-full bg-gray-50 dark:bg-slate-800 rounded-[2.5rem] overflow-hidden relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-xl z-40 flex items-center justify-center">
                                    <div className="w-8 h-0.5 bg-gray-800 rounded-full" />
                                </div>
                                <div 
                                    ref={phoneContentRef}
                                    onMouseEnter={() => setIsHovered(true)}
                                    onMouseLeave={() => setIsHovered(false)}
                                    className="w-full h-full overflow-y-auto hide-scroll touch-pan-y"
                                >
                                    {renderMockContent(true)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ====== FOOTER LINKS ====== */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-24 md:h-32 flex items-center">
                                <img src="/dechta.png" className="h-full w-auto object-contain" alt="Dechta" />
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">The all-in-one platform for home construction, renovation services, and professional grade hardware.</p>
                        <div className="mt-8">
                            <p className="font-bold text-sm mb-3 dark:text-white">Experience the Dechta app</p>
                            <div className="flex gap-3">
                                <a href="#" className="block hover:scale-105 transition-transform">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" className="h-10" alt="Play Store" />
                                </a>
                                <a href="#" className="block hover:scale-105 transition-transform">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" className="h-10" alt="App Store" />
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div>
                            <h4 className="font-bold mb-4 text-black dark:text-white">Company</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" className="hover:text-black dark:hover:text-white">About Dechta</a></li>
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Terms & conditions</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); onPrivacyClick?.(); }} className="hover:text-black dark:hover:text-white">Privacy policy</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-black dark:text-white">Services</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" onClick={(e) => { e.preventDefault(); onOpenDrawer?.('ac'); }} className="hover:text-black dark:hover:text-white">AC Repair</a></li>
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Carpentry</a></li>
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Plumbing</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-black dark:text-white">Store</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Tools</a></li>
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Materials</a></li>
                                <li><a href="#" className="hover:text-black dark:hover:text-white">Sell on Dechta</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-400">© 2026 Dechta Technologies.</p>
                    <div className="flex gap-4">
                        <Instagram className="w-5 h-5 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer" />
                        <Twitter className="w-5 h-5 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
