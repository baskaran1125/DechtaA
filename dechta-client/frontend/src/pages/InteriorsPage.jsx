import { useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, CalendarCheck, Award, Gem, MessageSquareDashed, FileCheck, Home, BrickWall, LampCeiling, PlugZap, Droplets, Layers, PaintRoller, Youtube, Sparkles, MessageCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function InteriorsPage({ onBack, onOpenConsultant }) {
    const { showToast } = useToast();
    const mainRef = useRef(null);
    const ytRef = useRef(null);
    const revealRef = useRef(null);
    const revealContainerRef = useRef(null);
    
    // Force scroll to top before paint to prevent "middle page" landing
    useLayoutEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    // Safety for GSAP pin synchronization and late layout shifts
    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            ScrollTrigger.refresh();
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const container = mainRef.current;
        if (!container) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.05 });
        container.querySelectorAll('.scroll-trigger').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // YouTube auto-scroll (matches HTML requestAnimationFrame logic)
    useEffect(() => {
        const ytSlider = ytRef.current;
        if (!ytSlider) return;
        let isHovering = false;
        let rafId;

        const onEnter = () => { isHovering = true; };
        const onLeave = () => { isHovering = false; };
        const onTouchStart = () => { isHovering = true; };
        const onTouchEnd = () => { setTimeout(() => { isHovering = false; }, 2000); };

        ytSlider.addEventListener('mouseenter', onEnter);
        ytSlider.addEventListener('mouseleave', onLeave);
        ytSlider.addEventListener('touchstart', onTouchStart);
        ytSlider.addEventListener('touchend', onTouchEnd);

        function autoScroll() {
            if (!isHovering && ytSlider) {
                ytSlider.scrollLeft += 1;
                if (ytSlider.scrollLeft >= (ytSlider.scrollWidth - ytSlider.clientWidth - 1)) {
                    ytSlider.scrollLeft = 0;
                }
            }
            rafId = requestAnimationFrame(autoScroll);
        }

        const timer = setTimeout(() => { rafId = requestAnimationFrame(autoScroll); }, 1000);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(rafId);
            ytSlider.removeEventListener('mouseenter', onEnter);
            ytSlider.removeEventListener('mouseleave', onLeave);
            ytSlider.removeEventListener('touchstart', onTouchStart);
            ytSlider.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    // GSAP Cinematic Transformation
    useEffect(() => {
        const container = revealContainerRef.current;
        const reveal = revealRef.current;
        if (!container || !reveal) return;

        let ctx = gsap.context(() => {
            gsap.set(reveal, { clipPath: "inset(0 100% 0 0)" });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: container,
                    start: "center center", // Pin when perfectly centered
                    end: "+=200%", // Longer distance to allow a pause
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1
                }
            });

            // 1. Reveal wipe (clip-path) and move border line simultaneously
            tl.to(reveal, { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 1 }, 0)
                .to(".reveal-border", { left: "100%", ease: "none", duration: 1 }, 0)
                .fromTo(".reveal-img", { scale: 1.1 }, { scale: 1, ease: "none", duration: 1 }, 0)
                // 2. Animate masterpiece text organically as it reveals
                .from(".transform-text-masterpiece", {
                    y: 40,
                    opacity: 0,
                    filter: "blur(10px)",
                    duration: 0.6,
                    ease: "power2.out"
                }, 0.5)
                // 3. The Pause: Empty tween keeps it pinned fully revealed for the remainder of the scroll
                .to({}, { duration: 0.6 });

            // Animate initial canvas text
            gsap.from(".transform-text-canvas", {
                y: 50,
                opacity: 0,
                filter: "blur(10px)",
                scrollTrigger: {
                    trigger: container,
                    start: "top 80%",
                    end: "center center",
                    scrub: 1
                }
            });
        }, container);

        return () => ctx.revert();
    }, []);

    const kitchens = [
        { img: '/images/interiors/elite_l_shaped_kitchen_1773465353696.png', style: 'Modern', name: 'L-Shaped', sub: 'Elite' },
        { img: '/images/interiors/island_setup_minimalist_kitchen_1773465373582.png', style: 'Minimalist', name: 'Island', sub: 'Setup' },
        { img: '/images/interiors/parallel_premium_kitchen_1773465389587.png', style: 'Premium', name: 'Parallel', sub: 'Kitchen' },
        { img: '/images/interiors/studio_layout_compact_kitchen_1773465408626.png', style: 'Compact', name: 'Studio', sub: 'Layout' },
    ];
    const bedrooms = [
        { img: '/images/interiors/master_bedroom_suite_1773465282498.png', style: 'Warm Tone', name: 'Master', sub: 'Suite' },
        { img: '/images/interiors/urban_rustic_bedroom_guest_1773465299557.png', style: 'Guest Room', name: 'Urban', sub: 'Rustic' },
        { img: '/images/interiors/modern_minimal_studio_bedroom_1773465315773.png', style: 'Studio', name: 'Modern', sub: 'Minimal' },
        { img: '/images/interiors/classic_comfort_luxury_bedroom_1773465333879.png', style: 'Luxury', name: 'Classic', sub: 'Comfort' },
    ];
    const livingRooms = [
        { img: '/images/interiors/open_living_modern_room_1773465430654.png', style: 'Modern', name: 'Open', sub: 'Living' },
        { img: '/images/interiors/scandi_lounge_minimalist_living_1773465446426.png', style: 'Minimalist', name: 'Scandi', sub: 'Lounge' },
        { img: '/images/interiors/classic_hall_luxury_living_1773465466954.png', style: 'Luxury', name: 'Classic', sub: 'Hall' },
        { img: '/images/interiors/artistic_living_contemporary_room_1773465483520.png', style: 'Contemporary', name: 'Artistic', sub: 'Living' },
    ];
    const kidsRooms = [
        { img: '/images/interiors/playful_junior_kids_room_1773465501049.png', style: 'Vibrant', name: 'Playful', sub: 'Junior' },
        { img: '/images/interiors/sweet_dreams_minimalist_nursery_1773465516211.png', style: 'Minimalist', name: 'Sweet', sub: 'Dreams' },
        { img: '/images/interiors/study_corner_creative_kids_room_1773465535997.png', style: 'Creative', name: 'Study', sub: 'Corner' },
        { img: '/images/interiors/cloud_nursery_modern_kids_room_1773465552987.png', style: 'Modern', name: 'Cloud', sub: 'Nursery' },
    ];

    const renderRoomCard = (room, i) => (
        <div key={i} className="room-card group/card shadow-2xl">
            <img src={room.img} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-[1.5s] ease-out" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 flex flex-col justify-end transform transition-transform duration-500 group-hover/card:-translate-y-2">
                <span className="text-white/70 uppercase tracking-[0.2em] text-[8px] md:text-[10px] font-bold mb-1 md:mb-2 block">{room.style}</span>
                <h4 className="text-white font-black text-lg md:text-3xl leading-tight">{room.name}<br />{room.sub}</h4>
                <div className="h-0.5 w-0 bg-[#0CEDED] mt-2 md:mt-4 transition-all duration-500 group-hover/card:w-12" />
            </div>
        </div>
    );

    const serviceIcons = [
        { icon: BrickWall, label: 'Civil Work', desc: 'Expert structural solutions' },
        { icon: LampCeiling, label: 'False Ceiling', desc: 'Modern ambient lighting' },
        { icon: PlugZap, label: 'Electrical', desc: 'Safe smart-home wiring' },
        { icon: Droplets, label: 'Plumbing', desc: 'Premium bath fittings' },
        { icon: Layers, label: 'Flooring', desc: 'Italian marble & tiling' },
        { icon: PaintRoller, label: 'Painting', desc: 'Premium luxury finishes' },
    ];

    return (
        <main ref={mainRef} className="max-w-7xl mx-auto px-4 pt-28 lg:pt-36 pb-24 space-y-12 md:space-y-20 z-20 relative font-sans">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 mb-6 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 flex items-center justify-center transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                Back to shopping
            </button>

            {/* Hero Section */}
            <section className="relative w-full h-auto min-h-[500px] lg:min-h-[650px] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl flex items-center py-8 lg:py-0">
                <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=80" className="absolute inset-0 w-full h-full object-cover transform scale-100 md:hover:scale-105 transition-transform duration-[3000ms] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/70 to-black/20" />
                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-8 items-center">
                    <div className="flex flex-col justify-center text-center lg:text-left pt-6 lg:pt-0">
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.15] mb-4 md:mb-6 tracking-tight drop-shadow-md">
                            Let's get started with <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0CEDED] to-white">your dream interiors</span>
                        </h1>
                        <p className="text-gray-300 text-sm md:text-lg mb-6 md:mb-8 font-medium max-w-lg mx-auto lg:mx-0 leading-relaxed">
                            Award-winning designs, premium materials, and flawless end-to-end execution. Transform your space starting at ₹1.5 Lakhs.
                        </p>
                        <div className="flex items-center justify-center lg:justify-start gap-4 md:gap-6 text-white/90 text-[10px] md:text-sm font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm"><ShieldCheck className="w-4 h-4 text-[#0CEDED]" /></div>
                                10-Year Warranty
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm"><CalendarCheck className="w-4 h-4 text-[#0CEDED]" /></div>
                                45-Day Delivery
                            </div>
                        </div>
                    </div>
                    {/* Form */}
                    <div className="flex justify-center lg:justify-end lg:pr-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 md:p-8 w-full max-w-[420px] border border-gray-100 dark:border-slate-800 relative">
                            <div className="absolute -top-3 -right-3 w-16 h-16 bg-[#0CEDED] rounded-full blur-2xl opacity-20 pointer-events-none" />
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Talk to a Designer</h2>
                            <form className="space-y-3 md:space-y-4" onSubmit={(e) => { e.preventDefault(); showToast('Request submitted! Our designer will contact you shortly.'); }}>
                                <input type="text" placeholder="Name" className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 md:py-3.5 text-sm font-medium focus:outline-none text-gray-900 dark:text-white placeholder-gray-400" required />
                                <input type="email" placeholder="Email ID" className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 md:py-3.5 text-sm font-medium focus:outline-none text-gray-900 dark:text-white placeholder-gray-400" required />
                                <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                                    <div className="bg-gray-50 dark:bg-slate-700 px-3 py-2.5 md:py-3.5 border-r border-gray-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
                                        <img src="https://flagcdn.com/w20/in.png" className="w-5 drop-shadow-sm" alt="India" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">+91</span>
                                    </div>
                                    <input type="tel" placeholder="Phone number" className="w-full bg-transparent px-4 py-2.5 md:py-3.5 text-sm font-medium focus:outline-none text-gray-900 dark:text-white placeholder-gray-400" pattern="[0-9]{10}" required />
                                </div>
                                <div className="flex items-center gap-2 py-0.5 md:py-1">
                                    <input type="checkbox" id="wa-updates" className="w-4 h-4 text-green-500 bg-white border-gray-300 rounded cursor-pointer" defaultChecked />
                                    <label htmlFor="wa-updates" className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer flex items-center gap-1">
                                        Send me updates on <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp
                                    </label>
                                </div>
                                <select defaultValue="" className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 md:py-3.5 text-sm font-medium focus:outline-none text-gray-600 dark:text-gray-300 appearance-none cursor-pointer" required>
                                    <option value="" disabled>Select City</option>
                                    <option value="chennai">Chennai</option>
                                    <option value="bangalore">Bangalore</option>
                                    <option value="hyderabad">Hyderabad</option>
                                    <option value="coimbatore">Coimbatore</option>
                                </select>
                                <button type="submit" className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold tracking-wide py-3 md:py-4 rounded-lg transition-all mt-2 md:mt-4 shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] text-sm md:text-base">GET FREE QUOTE</button>
                            </form>
                            <p className="text-[10px] text-gray-400 text-center mt-5 leading-relaxed">By submitting this form, you agree to the privacy policy and terms of use.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 border-y border-gray-200 dark:border-slate-800 py-10">
                {[
                    { icon: ShieldCheck, title: '10-Year Warranty', desc: 'On modular products' },
                    { icon: CalendarCheck, title: '45-Day Delivery', desc: 'Guaranteed timeline' },
                    { icon: Award, title: '1000+ Homes', desc: 'Premium finish' },
                    { icon: Gem, title: 'Top 1% Materials', desc: 'Branded hardware' },
                ].map((b, i) => (
                    <div key={i} className={`flex flex-col items-center text-center px-2 md:px-4 ${i > 0 ? 'border-l border-gray-100 dark:border-slate-800' : ''}`}>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-900 dark:text-white mb-2 md:mb-4">
                            <b.icon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-[10px] md:text-lg mb-0.5">{b.title}</h3>
                        <p className="text-[8px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">{b.desc}</p>
                    </div>
                ))}
            </section>

            {/* Cinematic Transformation Section (V4 - Contained Layout) */}
            {/* Cinematic Transformation Section (V4 - Contained Layout) */}
            <section className="w-full relative py-6 md:py-20 z-10 overflow-hidden">
                <div ref={revealContainerRef} className="max-w-7xl mx-auto px-4">
                    <div className="relative w-full aspect-[3/2] md:aspect-[21/9] overflow-hidden rounded-[1.5rem] md:rounded-[3rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-gray-200/20 dark:border-white/10 bg-black">
                        {/* Blank Hall (Bottom Layer) */}
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                            <img src="/empty room.png"
                                className="w-full h-full object-cover opacity-90 contrast-[1.05] brightness-110" alt="Empty Hall" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center w-full transform-text-canvas px-4">
                                <h2 className="text-xl md:text-6xl font-black text-white uppercase tracking-[0.2em] md:tracking-[0.3em] leading-tight mb-2 md:mb-4 drop-shadow-xl">
                                    Turn your<br /><span className="text-white/80">empty room</span>
                                </h2>
                                <p className="text-white/60 text-[8px] md:text-sm font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase drop-shadow-md">Starting from raw potential</p>
                            </div>
                        </div>

                        {/* Furnished Room (Top Layer - Animated clipPath) */}
                        <div ref={revealRef} className="absolute inset-0 w-full h-full z-20" style={{ clipPath: 'inset(0 100% 0 0)' }}>
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
                                    className="w-full h-full object-cover reveal-img" alt="Furnished Reality" />
                                <div className="absolute inset-0 bg-black/10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>

                            {/* Masterpiece Content */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center w-full transform-text-masterpiece px-6">
                                <h2 className="text-xl md:text-5xl font-black text-white uppercase tracking-tight leading-[0.9] drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)]">
                                    Into a <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0CEDED] to-white italic font-serif">Masterpiece</span>
                                </h2>
                            </div>
                        </div>
                        {/* Animated Border Line */}
                        <div className="absolute top-0 bottom-0 left-0 w-1 md:w-[6px] bg-[#0CEDED] shadow-[0_0_20px_rgba(12,237,237,0.8)] z-20 reveal-border -translate-x-1/2" />

                        {/* Aesthetic Scroll Prompt */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 group">
                            <span className="text-white/60 text-[8px] font-black tracking-[0.4em] uppercase group-hover:text-[#0CEDED] transition-colors duration-500 drop-shadow-md">Slide to build</span>
                            <div className="w-[2px] h-10 bg-white/20 rounded-full relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[30%] bg-[#0CEDED] rounded-full animate-infinite-scroll-down" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Room Gallery: Kitchens */}
            <section>
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 md:mb-12 gap-4 px-4 md:px-0">
                    <div>
                        <span className="text-cyan-500 font-bold tracking-widest text-[10px] uppercase mb-2 block">Inspiration Gallery</span>
                        <h2 className="text-2xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight">Explore by Room</h2>
                    </div>
                    <button className="text-sm font-bold text-gray-900 dark:text-white hover:text-cyan-500 transition-colors flex items-center gap-2 pb-1 border-b-2 border-gray-200 dark:border-slate-800 hover:border-cyan-500">
                        View All Designs <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-10 md:space-y-16 py-4 md:py-8">
                    <div>
                        <div className="flex items-center mb-4 md:mb-8 px-4 md:px-0">
                            <h3 className="text-lg md:text-3xl font-black dark:text-white tracking-tight flex items-center gap-2 md:gap-3">
                                <span className="w-1 h-6 md:w-1.5 md:h-8 bg-orange-400 rounded-full" /> Modular Kitchens
                            </h3>
                        </div>
                        <div className="relative overflow-hidden">
                            <div className="animate-marquee-left gap-3 md:gap-8 px-4 md:px-0">
                                {[...kitchens, ...kitchens].map((r, i) => renderRoomCard(r, `k-${i}`))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center mb-4 md:mb-8 px-4 md:px-0">
                            <h3 className="text-lg md:text-3xl font-black dark:text-white tracking-tight flex items-center gap-2 md:gap-3">
                                <span className="w-1 h-6 md:w-1.5 md:h-8 bg-indigo-500 rounded-full" /> Cozy Bedrooms
                            </h3>
                        </div>
                        <div className="relative overflow-hidden">
                            <div className="animate-marquee-right gap-3 md:gap-8 px-4 md:px-0">
                                {[...bedrooms, ...bedrooms].map((r, i) => renderRoomCard(r, `b-${i}`))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center mb-4 md:mb-8 px-4 md:px-0">
                            <h3 className="text-lg md:text-3xl font-black dark:text-white tracking-tight flex items-center gap-2 md:gap-3">
                                <span className="w-1 h-6 md:w-1.5 md:h-8 bg-emerald-500 rounded-full" /> Elegant Living Rooms
                            </h3>
                        </div>
                        <div className="relative overflow-hidden">
                            <div className="animate-marquee-left gap-3 md:gap-8 px-4 md:px-0">
                                {[...livingRooms, ...livingRooms].map((r, i) => renderRoomCard(r, `l-${i}`))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center mb-4 md:mb-8 px-4 md:px-0">
                            <h3 className="text-lg md:text-3xl font-black dark:text-white tracking-tight flex items-center gap-2 md:gap-3">
                                <span className="w-1 h-6 md:w-1.5 md:h-8 bg-pink-500 rounded-full" /> Playful Kids Rooms
                            </h3>
                        </div>
                        <div className="relative overflow-hidden">
                            <div className="animate-marquee-right gap-3 md:gap-8 px-4 md:px-0">
                                {[...kidsRooms, ...kidsRooms].map((r, i) => renderRoomCard(r, `kc-${i}`))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="bg-gray-50 dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-16 my-8 md:my-12 shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3 md:mb-4">How it works</h2>
                    <p className="text-xs md:text-base text-gray-500 dark:text-gray-400">Your dream home is just 3 simple steps away. We handle everything from design to installation.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gray-200 dark:bg-slate-700 z-0" />
                    {[
                        { icon: MessageSquareDashed, step: '1. Meet Designer', desc: 'Get a free consultation and a personalized 3D design proposal based on your floor plan.' },
                        { icon: FileCheck, step: '2. Confirm & Book', desc: 'Finalize your materials, finishes, and budget. Pay 5% to book your interior project.' },
                        { icon: Home, step: '3. Move In', desc: 'Our execution team builds and installs everything within 45 days. Welcome home.' },
                    ].map((s, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white dark:bg-slate-950 rounded-full shadow-lg border border-gray-100 dark:border-slate-800 flex items-center justify-center mb-6 text-cyan-500">
                                <s.icon className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.step}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Banner */}
            <section className="py-8 md:py-20 bg-black rounded-[2rem] md:rounded-[3rem] text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
                <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center relative z-10">
                    {[
                        { val: '12+', color: 'text-cyan-400', label: 'Years' },
                        { val: '500+', color: 'text-white', label: 'Homes' },
                        { val: '100%', color: 'text-white', label: 'Safety' },
                        { val: '4.9', color: 'text-cyan-400', label: 'Rating' },
                    ].map((s, i) => (
                        <div key={i} className="space-y-1 md:space-y-2">
                            <h4 className={`text-2xl md:text-6xl font-black ${s.color}`}>{s.val}</h4>
                            <p className="text-[8px] md:text-sm font-bold uppercase tracking-[0.2em] text-gray-400">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-8 md:py-16 scroll-trigger">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 md:mb-12 gap-6 px-4 md:px-0">
                    <div className="max-w-2xl">
                        <h2 className="text-2xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-3 md:mb-4 leading-tight">We offer unparalleled services</h2>
                        <p className="text-xs md:text-lg text-gray-500 dark:text-gray-400">Our interior designers work with you keeping in mind your requirements and budget.</p>
                    </div>
                    <button onClick={onOpenConsultant} className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] transition-all hover:-translate-y-1 shrink-0 tracking-wide text-xs md:text-sm">GET FREE QUOTE</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-10 px-4 md:px-0">
                    {serviceIcons.map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 flex flex-col items-center justify-center text-center group hover:-translate-y-3 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer">
                            <div className="relative w-16 h-16 md:w-28 md:h-28 flex items-center justify-center mb-4 md:mb-6">
                                <div className={`absolute inset-0 bg-cyan-50 dark:bg-cyan-900/10 rounded-[1.2rem] md:rounded-[2rem] ${i % 2 === 0 ? 'rotate-6 group-hover:rotate-12' : '-rotate-6 group-hover:-rotate-12'} group-hover:bg-cyan-100 transition-all duration-500`} />
                                <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[1.2rem] md:rounded-[2rem] border border-cyan-100 dark:border-cyan-800/50 shadow-sm relative z-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <s.icon className="w-7 h-7 md:w-12 md:h-12 text-gray-700 dark:text-gray-300 group-hover:text-cyan-500 transition-colors duration-500" />
                                </div>
                            </div>
                            <h3 className="font-bold text-sm md:text-xl text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors tracking-tight">{s.label}</h3>
                            <p className="text-[8px] md:text-[10px] text-gray-400 mt-1 md:mt-2 font-medium opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* YouTube Section */}
            <section className="py-8 md:py-16 scroll-trigger">
                <div className="flex justify-between items-end mb-6 md:mb-8 px-4 md:px-0">
                    <div>
                        <span className="text-red-600 font-bold tracking-widest text-[10px] uppercase mb-2 block flex items-center gap-2">
                            <Youtube className="w-3.5 h-3.5" /> Project Walkthroughs
                        </span>
                        <h2 className="text-2xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Trusted by Customers</h2>
                    </div>
                </div>
                <div ref={ytRef} id="youtube-slider" className="flex gap-4 md:gap-6 overflow-x-auto hide-scroll pb-8 px-4 md:px-8">
                    {[
                        'https://www.youtube.com/embed/VzETPw-CUWg?si=wEvjphYtG9ElKt6u&rel=0',
                        'https://www.youtube.com/embed/71N_QxfEvKU?rel=0',
                        'https://www.youtube.com/embed/8AFhlbXeims?rel=0',
                        'https://www.youtube.com/embed/hjCQnz550ic?rel=0',
                        'https://www.youtube.com/embed/HRynM0PY3_Y?rel=0',
                    ].map((url, i) => (
                        <div key={i} className="snap-center shrink-0 w-[70vw] md:w-[450px] aspect-video bg-gray-100 dark:bg-slate-800 rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-200 dark:border-slate-700 relative">
                            <iframe className="w-full h-full absolute inset-0" src={url} title={`Interior Design Reveal ${i + 1}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
