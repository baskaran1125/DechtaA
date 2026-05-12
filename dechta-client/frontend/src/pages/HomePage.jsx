import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Star, ShieldCheck, Clock, MapPin, Heart, Eye } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Player } from '@lottiefiles/react-lottie-player';

// Use onWishlistClick passed from App.jsx instead of direct context toggle
export default function HomePage({ hardware, services, liveProducts = [], groupedProducts = [], activeVendors = [], onOpenProduct, onAddToCart, onWishlistClick, onNotifyClick, onOpenDrawer, onOpenHireMap, onOpenInteriors, selectedVendor, onSelectVendor }) {
    const { cart, updateQty } = useCart();
    const { userData } = useAuth();
    const hwRef = useRef(null);
    const mainRef = useRef(null);
    const offersSliderRef = useRef(null);

    // Scroll trigger observer for animations
    useEffect(() => {
        const container = mainRef.current;
        if (!container) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.05 });
        container.querySelectorAll('.scroll-trigger').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // GSAP hero cards animation
    useEffect(() => {
        const heroSection = document.getElementById('hero-main-cards');
        if (!heroSection) return;
        
        const heroAnimationTimer = setTimeout(() => {
            heroSection.style.opacity = '1';
            heroSection.style.transform = 'translateY(0)';
        }, 300);
        
        return () => clearTimeout(heroAnimationTimer);
    }, []);

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const autoScrollTimerRef = useRef(null);

    const startAutoScroll = () => {
        stopAutoScroll();
        autoScrollTimerRef.current = setInterval(() => {
            const slider = offersSliderRef.current;
            if (!slider || !slider.firstElementChild) return;
            
            const cardWidth = slider.firstElementChild.offsetWidth;
            const gap = 24; // matches md:gap-6
            const totalStep = cardWidth + gap;

            if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                slider.scrollBy({ left: totalStep, behavior: 'smooth' });
            }
        }, 5000);
    };

    const stopAutoScroll = () => {
        if (autoScrollTimerRef.current) {
            clearInterval(autoScrollTimerRef.current);
        }
    };

    useEffect(() => {
        startAutoScroll();
        return () => stopAutoScroll();
    }, []);

    const scrollSlider = (id, dir) => {
        stopAutoScroll();
        const slider = offersSliderRef.current;
        if (!slider || !slider.firstElementChild) return;

        const cardWidth = slider.firstElementChild.offsetWidth;
        const gap = 16; // gap-4 is 16px
        const totalStep = cardWidth + gap;

        if (dir === 1 && (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10)) {
            slider.scrollTo({ left: 0, behavior: 'smooth' });
        } else if (dir === -1 && slider.scrollLeft <= 10) {
            slider.scrollTo({ left: slider.scrollWidth, behavior: 'smooth' });
        } else {
            slider.scrollBy({ left: totalStep * dir, behavior: 'smooth' });
        }
        startAutoScroll();
    };

    const handleSliderScroll = (e) => {
        const slider = e.target;
        const cardWidth = slider.querySelector('.offer-card')?.clientWidth || 0;
        const gap = 16;
        const index = Math.round(slider.scrollLeft / (cardWidth + gap));
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };





    const offerItems = [
        { 
            title: "Construction\nMaterials Sale", 
            subtitle: "Cement, Steel & Bricks", 
            badge: "Bulk Deal", 
            badgeColor: "text-yellow-400",
            bg: "#2A2A2A", 
            img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600", 
            type: "hardware", 
            btn: "Shop Now",
            opacity: "opacity-60"
        },
        { 
            title: "Expert Loadman\nServices", 
            subtitle: "Shifting & Heavy Lifting", 
            badge: "Flat 20% OFF", 
            badgeBg: "bg-blue-500",
            bg: "#1e3a8a", 
            img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600", 
            type: "drawer", 
            key: "loadman", 
            btn: "Book Now",
            opacity: "opacity-70"
        },
        { 
            title: "Need Professional Workers\nThen Hire Now", 
            subtitle: "Pay after 100% satisfaction", 
            bg: "#8B5E55", 
            img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600", 
            type: "hire", 
            btn: "Find Pros",
            opacity: "opacity-80"
        },
        { 
            title: "Premium Interiors\nBonanza", 
            subtitle: "Flat ₹50,000 Off on Modular Kitchens", 
            badge: "New Launch", 
            badgeColor: "text-green-300",
            bg: "#065f46", 
            img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600", 
            type: "interiors", 
            btn: "View Designs",
            opacity: "opacity-60"
        },
        {
            title: "Power Tools\nCombo Pack",
            subtitle: "Save 30% on Drill & Grinder Sets",
            badge: "Flash Sale",
            badgeColor: "text-indigo-200",
            bg: "#4338ca",
            img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
            type: "hardware",
            btn: "Grab Deal",
            opacity: "opacity-60"
        }
    ];

    // Quote section scroll-triggered animation (matches HTML GSAP ScrollTrigger)
    useEffect(() => {
        const quoteSection = document.getElementById('quote-section');
        if (!quoteSection) return;
        const leftEl = document.getElementById('quote-anim-left');
        const rightEl = document.getElementById('quote-text-right');
        if (!leftEl || !rightEl) return;

        let quoteAnimTimer = null;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    leftEl.style.transition = 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    leftEl.style.transform = 'translateX(0)';
                    leftEl.style.opacity = '1';
                    quoteAnimTimer = setTimeout(() => {
                        rightEl.style.transition = 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
                        rightEl.style.transform = 'translateX(0)';
                        rightEl.style.opacity = '1';
                    }, 200);
                    // Only trigger once
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        observer.observe(quoteSection);
        return () => {
            if (quoteAnimTimer) clearTimeout(quoteAnimTimer);
            observer.disconnect();
        };
    }, []);

    const getImg = (p) => {
        if (Array.isArray(p.images) && p.images[0]) return p.images[0];
        if (typeof p.images === 'string' && p.images.startsWith('http')) return p.images;
        return p.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400';
    };

    const renderProductCard = (item) => {
        const qty = cart[item.id]?.qty || 0;
        const price = Number(item.selling_price || item.price) || 0;
        const mrp = Number(item.mrp) || Math.round(price * 1.2);
        const savings = mrp - price;
        const tag = item.tag || (item.is_bulk ? 'BULK' : '');
        // Check if item is in the main wishlist or any folder
        const isLiked = userData?.wishlist?.includes(item.id) || userData?.wishlist?.includes(String(item.id)) || userData.wishlistFolders?.some(f => Array.isArray(f.items) && f.items.includes(item.id));

        return (
            <div key={item.id} className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg md:rounded-xl p-1.5 md:p-2 flex flex-col group cursor-pointer hover:shadow-md transition-all duration-300 relative"
                onClick={() => onOpenProduct(item)}>
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] md:aspect-square bg-gray-50/50 dark:bg-slate-800/50 rounded-md md:rounded-lg mb-1.5 md:mb-2 flex flex-col items-center justify-center p-1 md:p-2 overflow-hidden">
                    <img src={getImg(item)} className="w-[80%] h-[80%] md:w-full md:h-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-105 transition-transform duration-500" onError={e => e.target.src = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'} />
                    {tag && <div className="absolute top-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-br-md md:rounded-br-lg rounded-tl-md md:rounded-tl-lg shadow-sm z-10">{tag}</div>}
                    <button
                        onClick={(e) => { e.stopPropagation(); onWishlistClick(item, e); }}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${isLiked ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-white/80 dark:bg-slate-900/80 text-gray-400 hover:text-red-500 dark:text-gray-500'}`}
                    >    <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                    {item.outOfStock && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
                            <span className="bg-red-500/90 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg -rotate-12">Out of Stock</span>
                        </div>
                    )}
                    {/* Compact Mobile Add Button overlapping image */}
                    <div className="absolute bottom-1 right-1 md:hidden shadow-sm shadow-cyan-500/10 z-20">
                        {item.outOfStock ? (
                            <button onClick={(e) => { e.stopPropagation(); onNotifyClick(item); }} className="h-6 px-3 bg-white text-orange-600 border border-orange-200 rounded text-[9px] font-bold uppercase shadow-sm">Notify</button>
                        ) : qty > 0 ? (
                            <div className="flex items-center h-6 w-[56px] bg-cyan-500 border border-cyan-500 rounded text-white overflow-hidden shadow-md" onClick={e => e.stopPropagation()}>
                                <button onClick={() => updateQty(item.id, -1)} className="w-1/3 h-full flex flex-col items-center justify-center font-bold text-[10px] leading-none bg-cyan-600 active:bg-cyan-700">-</button>
                                <span className="w-1/3 font-bold text-[9px] text-center leading-none flex items-center justify-center h-full bg-white text-cyan-600">{qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-1/3 h-full flex flex-col items-center justify-center font-bold text-[10px] leading-none bg-cyan-600 active:bg-cyan-700">+</button>
                            </div>
                        ) : (
                            <button onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart({ id: item.id, name: item.name, price, img: getImg(item), tier: item.tier || 1, vendorId: selectedVendor?.id, vendorName: selectedVendor?.shop_name });
                            }} className="h-6 px-3 bg-white text-cyan-600 border border-cyan-200 rounded text-[9px] font-bold uppercase shadow-sm">ADD</button>
                        )}
                    </div>
                </div>
                {/* Product Details */}
                <div className="flex flex-col flex-1 px-1">
                    <span className="text-[8px] md:text-[9px] text-gray-400 font-bold mb-0.5">1 piece</span>
                    <h3 className="font-bold text-[10px] md:text-[12px] text-gray-800 dark:text-gray-200 leading-[1.2] line-clamp-2 md:min-h-[28px] mb-1 group-hover:text-cyan-600 transition-colors">{item.name}</h3>
                    <div className="flex items-end justify-between mt-auto w-full pt-1">
                        <div className="flex flex-col">
                            {savings > 0 ? <span className="text-[8px] md:text-[9px] text-gray-400 line-through mb-[1px]">₹{mrp.toLocaleString('en-IN')}</span> : <div className="h-[12px] md:h-[13px] mb-[1px]" />}
                            <span className="font-bold text-[11px] md:text-sm text-black dark:text-white leading-none">₹{price.toLocaleString('en-IN')}</span>
                        </div>
                        {/* Desktop Add Button */}
                        <div className="hidden md:block shrink-0 relative z-20" onClick={e => e.stopPropagation()}>
                            {item.outOfStock ? (
                                <button onClick={() => onNotifyClick(item)}
                                    className="h-7 px-4 bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 rounded-lg text-[10px] font-bold uppercase transition-colors shadow-sm">NOTIFY ME</button>
                            ) : qty > 0 ? (
                                <div className="flex items-center h-7 w-[64px] bg-cyan-500 rounded-lg shadow-sm overflow-hidden shrink-0 border border-cyan-500">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-1/3 h-full flex flex-col items-center justify-center font-bold text-white text-[11px] leading-none bg-cyan-600">-</button>
                                    <span className="w-1/3 font-bold text-[11px] text-cyan-600 bg-white text-center leading-none flex items-center justify-center h-full">{qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-1/3 h-full flex flex-col items-center justify-center font-bold text-white text-[11px] leading-none bg-cyan-600">+</button>
                                </div>
                            ) : (
                                <button onClick={() => onAddToCart({ id: item.id, name: item.name, price, img: getImg(item), tier: item.tier || 1, vendorId: selectedVendor?.id, vendorName: selectedVendor?.shop_name })}
                                    className="h-7 px-4 bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-lg text-[10px] font-bold uppercase transition-colors shadow-sm">ADD</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main ref={mainRef} className="max-w-7xl mx-auto px-4 pt-44 lg:pt-36 pb-24 space-y-8 lg:space-y-16 relative z-20">

            {/* ====== HERO CARDS (exact match) ====== */}
            <section id="hero-main-cards" className="grid grid-cols-2 gap-3 md:gap-6 px-4 pb-8 max-w-4xl mx-auto mt-4 relative z-20" style={{ opacity: 0, transform: 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div onClick={() => hwRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 h-[160px] md:h-[200px] relative overflow-hidden cursor-pointer group shadow-xl border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                    <div className="relative z-10 flex flex-col justify-start pt-5 md:pt-0 md:justify-center h-full items-start pl-1">
                        <h3 className="text-[17px] md:text-3xl font-black text-gray-800 dark:text-white leading-none tracking-tight mb-1 md:mb-2 uppercase">HARDWARE<br />STORE</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] md:text-xs tracking-widest uppercase mb-2 md:mb-4">Tool Delivery</p>
                    </div>
                    <div className="absolute bottom-4 left-4 z-10">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg group-hover:scale-110 transition-all duration-300">
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <img src="https://cdn-icons-png.flaticon.com/512/4851/4851562.png"
                        className="absolute bottom-1 right-0 w-16 h-16 md:w-32 md:h-32 md:bottom-2 md:right-2 object-contain drop-shadow-xl group-hover:scale-105 group-hover:rotate-6 transition-transform duration-500 z-0" alt="Tools" />
                </div>

                <div onClick={onOpenHireMap} className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 h-[160px] md:h-[200px] relative overflow-hidden cursor-pointer group shadow-xl border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                    <div className="relative z-10 flex flex-col justify-start pt-5 md:pt-0 md:justify-center h-full items-start pl-1">
                        <h3 className="text-[17px] md:text-3xl font-black text-gray-800 dark:text-white leading-none tracking-tight mb-1 md:mb-2 uppercase">HIRE<br />WORKERS</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] md:text-xs tracking-widest uppercase mb-2 md:mb-4">Masons • Helpers</p>
                    </div>
                    <div className="absolute bottom-4 left-4 z-10">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg group-hover:scale-110 transition-all duration-300">
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <img src="https://png.pngtree.com/png-vector/20241109/ourmid/pngtree-bearded-cartoon-construction-worker-with-safety-gear-png-image_14332182.png"
                        className="absolute -bottom-2 -right-3 w-20 h-20 md:w-36 md:h-36 object-contain drop-shadow-xl group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-500 z-0" alt="Worker" />
                </div>
            </section>

            {/* ====== OFFERS SLIDER (Visual Match) ====== */}
            <section className="slider-container relative scroll-trigger">
                <div className="flex justify-between items-end mb-4 px-4 md:px-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Offers & discounts</h2>
                    <div className="flex gap-2">
                        <button onClick={() => scrollSlider('offers-slider', -1)} className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 dark:text-gray-400 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => scrollSlider('offers-slider', 1)} className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 dark:text-gray-400 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <div 
                        ref={offersSliderRef}
                        id="offers-slider"
                        className="flex gap-4 overflow-x-auto hide-scroll snap-x snap-mandatory pb-10 pt-10 px-4 md:px-0 scroll-smooth"
                        onScroll={handleSliderScroll}
                        onMouseEnter={stopAutoScroll}
                        onMouseLeave={startAutoScroll}
                        onTouchStart={stopAutoScroll}
                        onTouchEnd={() => setTimeout(startAutoScroll, 2000)}
                    >
                        {offerItems.map((item, idx) => (
                            <div key={idx} onClick={() => {
                                if (item.type === "hardware") hwRef.current?.scrollIntoView({ behavior: "smooth" });
                                else if (item.type === "hire") onOpenHireMap();
                                else if (item.type === "interiors") onOpenInteriors();
                                else if (item.type === "drawer") onOpenDrawer(item.key);
                            }} 
                            className="offer-card shrink-0 w-[calc(100vw-2rem)] md:w-[calc(33.333%-11px)] h-[220px] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden snap-center pop-card hover:shadow-xl cursor-pointer text-white group border border-transparent dark:border-gray-800 transition-all duration-500 hover:-translate-y-1" 
                            style={{ backgroundColor: item.bg }}>
                                
                                <div className="relative z-10">
                                    {item.badge && (
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 inline-block ${item.badgeBg || ''} ${item.badgeColor || ''} ${item.badgeBg ? 'px-2 py-0.5 rounded' : ''}`}>
                                            {item.badge}
                                        </div>
                                    )}
                                    <h3 className="text-2xl font-bold leading-tight mb-2 whitespace-pre-line">{item.title}</h3>
                                    <p className="text-white/80 text-sm font-normal">{item.subtitle}</p>
                                </div>

                                <button className="relative z-10 bg-white text-black w-fit px-5 py-2.5 rounded-lg font-bold text-sm group-hover:bg-gray-200 transition-colors">
                                    {item.btn}
                                </button>
                                
                                <img src={item.img} className={`absolute right-0 top-0 h-full w-2/3 object-cover ${item.opacity || 'opacity-60'} group-hover:scale-105 transition-transform duration-700`} alt="" />
                            </div>
                        ))}
                    </div>

                </div>
            </section>


            {/* ====== HARDWARE STORE / CATEGORY SECTIONS ====== */}
            <section className="relative group scroll-trigger">

                {/* ── Category Pill Strip ── */}
                {groupedProducts.length > 0 && (
                    <div className="mb-6 -mx-4 md:mx-0">
                        <div className="flex gap-2 overflow-x-auto px-4 md:px-0 pb-2 scrollbar-hide">
                            <button
                                onClick={() => { setActiveCategory('all'); hwRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeCategory === 'all' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-gray-400'}`}
                            >
                                All
                            </button>
                            {groupedProducts.map((group) => (
                                <button
                                    key={group.category}
                                    onClick={() => { setActiveCategory(group.category); document.getElementById(`cat-${group.category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeCategory === group.category ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-gray-400'}`}
                                >
                                    {group.display_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {groupedProducts.length > 0 ? (
                    groupedProducts.map((group, idx) => (
                        <div key={group.category} id={`cat-${group.category}`} className="mb-10" ref={idx === 0 ? hwRef : null}>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{group.display_name}</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-0.5 md:gap-3 bg-gray-100 dark:bg-slate-800 md:bg-transparent md:dark:bg-transparent -mx-4 md:mx-0 border-y border-gray-100 dark:border-slate-800 md:border-none">
                                {group.products.map(p => (
                                    <div key={p.id} className="relative bg-white dark:bg-slate-900 md:bg-transparent border-r border-b border-gray-100 dark:border-slate-800 md:border-none last:border-r-0 md:last:border-r-transparent">
                                        {renderProductCard(p)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="mb-12">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tools & Hardware</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 uppercase tracking-wider font-bold">Quick delivery to your site</p>
                            </div>
                        </div>

                        {/* First Segment (Grid layout matching Zepto style) */}
                        <div ref={hwRef} id="hardware-slider" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-0.5 md:gap-3 pb-8 bg-gray-100 dark:bg-slate-800 md:bg-transparent md:dark:bg-transparent -mx-4 md:mx-0 border-y border-gray-100 dark:border-slate-800 md:border-none">
                            {liveProducts.length > 0 ? (
                                (() => {
                                    const getIdx = () => {
                                        if (typeof window === 'undefined') return 18;
                                        const w = window.innerWidth;
                                        if (w >= 1280) return 18;
                                        if (w >= 1024) return 15;
                                        if (w >= 768) return 12;
                                        return 9;
                                    };
                                    return liveProducts.slice(0, getIdx()).map((p) => (
                                        <div key={p.id} className="relative bg-white dark:bg-slate-900 md:bg-transparent border-r border-b border-gray-100 dark:border-slate-800 md:border-none last:border-r-0 md:last:border-r-transparent">
                                            {renderProductCard(p)}
                                        </div>
                                    ));
                                })()
                            ) : (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                        <ShieldCheck className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No products found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto mt-1">Vendor products will appear here once they are added in the vendor portal.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Interiors Section (Integrated between rows) */}
                <div className="py-8 scroll-trigger px-4 md:px-0">
                    <div onClick={onOpenInteriors} className="w-full cursor-pointer group relative min-h-[400px] md:h-[400px] rounded-[2.5rem] md:rounded-[3.5rem] bg-[#E8F5E9] dark:bg-slate-900 animated-card border border-green-100 dark:border-slate-800 p-8 md:p-16 overflow-hidden flex flex-col md:flex-row items-center gap-12 md:gap-20 transition-all duration-500 hover:shadow-2xl">
                        <div className="relative z-20 text-center md:text-left flex-1">
                            <div className="bg-green-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full inline-block mb-3 md:mb-6 uppercase tracking-widest shadow-sm">Premium Service</div>
                            <h3 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white leading-[1.1] mb-2">Interiors &<br />Design</h3>
                            <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto md:mx-0 leading-relaxed italic line-clamp-2">"Transform your home into a masterpiece with our experts."</p>
                            <button className="mt-8 bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto md:mx-0 shadow-lg">
                                Explore Designs <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative w-full md:w-5/12 h-48 md:h-full z-10 flex items-center justify-center">
                            <Player src="/interiors.json" autoplay loop speed={1.5} style={{ width: '100%', height: '100%', transform: 'scale(1.2)' }} />
                        </div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/50 dark:bg-green-900/10 rounded-full blur-[100px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200/40 dark:bg-cyan-900/10 rounded-full blur-[80px] pointer-events-none z-0 -translate-x-1/4 translate-y-1/4" />
                    </div>
                </div>

            </section>



            {/* ====== BULK ORDERS BANNER (exact match) ====== */}
            <section className="relative w-full bg-[#1c1917] dark:bg-black rounded-2xl overflow-hidden flex flex-col md:flex-row text-white group hover:shadow-2xl transition-shadow duration-300 scroll-trigger">
                <div className="p-8 md:p-12 md:w-5/12 z-20 relative flex flex-col justify-center">
                    <div className="text-orange-500 font-bold tracking-wider text-xs uppercase mb-3">Bulk Orders Available</div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-white/60 font-bold tracking-[0.2em] text-sm">CONSTRUCTION</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md leading-tight">Essential Sand<br /><span className="text-gray-400 text-3xl">for your Building</span></h2>
                    <p className="text-gray-400 text-lg mb-4">River Sand. M-Sand. P-Sand. High quality aggregates delivered instantly to your site.</p>
                </div>
                <div className="relative w-full md:w-7/12 h-[350px] md:h-[450px] p-4">
                    <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full w-full">
                        <div className="row-span-2 relative rounded-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 border border-white/10">
                            <img src="https://media.istockphoto.com/id/1018166602/photo/rusovich-pours-sand-on-the-construction-site.jpg?s=612x612&w=0&k=20&c=879NpeguNA_eDDLOgf62jw5nY4KsZNFZEtORiyV3IEo=" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4"><span className="text-xs font-bold text-white">Manual Labor</span></div>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 delay-75 border border-white/10">
                            <img src="https://t3.ftcdn.net/jpg/10/40/36/26/240_F_1040362666_0hv4EN9XAaPyuLhH6c1oLQzmmaEzYbI6.jpg" className="w-full h-full object-cover" />
                        </div>
                        <div className="relative rounded-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 delay-100 border border-white/10">
                            <img src="https://t4.ftcdn.net/jpg/08/41/31/65/240_F_841316511_p9k11PR7MzBfYINqNanrOVvarTzQo9uF.jpg" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4"><span className="text-xs font-bold text-white">Fine Aggregate</span></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ====== QUOTE SECTION (exact match with scroll animation) ====== */}
            <section id="quote-section" className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-center gap-12 overflow-hidden">
                <div id="quote-anim-left" className="w-full md:w-1/2 flex justify-center md:justify-end" style={{ opacity: 0, transform: 'translateX(-150px)' }}>
                    <Player src="/construction.json" autoplay loop style={{ width: '100%', maxWidth: '400px', height: '350px' }} />
                </div>
                <div id="quote-text-right" className="w-full md:w-1/2 text-center md:text-left" style={{ opacity: 0, transform: 'translateX(150px)' }}>
                    <h3 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                        "We shape your dream ideas<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Into Complete World.</span>"
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xl italic font-medium">
                        — Building the foundation for your future.
                    </p>
                </div>
            </section>

            {/* ====== WHY CHOOSE US (exact match) ====== */}
            <section className="bg-gray-50 dark:bg-slate-900 rounded-3xl p-12 scroll-trigger">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why choose Quick Construct?</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Trusted by thousands of homeowners across Chennai</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-cyan-500">
                            <Star className="w-8 h-8 fill-current" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">4.8</h3>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average Rating</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-green-500">
                            <img src="https://img.icons8.com/color/96/visible.png" className="w-8 h-8 object-contain" alt="Transparency" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">100%</h3>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transparency</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-blue-500">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">100%</h3>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verified Pros</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-purple-500">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">60m</h3>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Arrival Time</p>
                    </div>
                </div>
            </section>

            {/* ====== JOIN US SECTION (exact match) ====== */}
            <section id="join-us-section" className="scroll-trigger py-4">
                <div className="text-center mb-8 md:mb-12">
                    <span className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-2 block">JOIN US</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white dark:!text-white mb-2 md:mb-3">Want to Join us?</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Partner and grow with Quick Construct</p>
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-8 px-2 md:px-0 pb-4">
                    {/* Sell with us */}
                    <div className="w-full flex-col flex bg-white dark:bg-slate-900 rounded-xl md:rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 md:hover:-translate-y-2 group cursor-pointer relative">
                        <div className="h-20 sm:h-24 md:h-48 shrink-0 bg-orange-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                            <svg viewBox="0 0 300 200" className="w-full h-full max-w-[280px] relative z-10">
                                <defs>
                                    <linearGradient id="shopBg" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#FFF7ED" />
                                        <stop offset="100%" stopColor="#FFEDD5" />
                                    </linearGradient>
                                    <linearGradient id="shopBgDark" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#1E293B" />
                                        <stop offset="100%" stopColor="#0F172A" />
                                    </linearGradient>
                                </defs>
                                <style>
                                    {`
                                        @keyframes shopkeeperFloat {
                                            0%, 100% { transform: translateY(0); }
                                            50% { transform: translateY(-3px); }
                                        }
                                        @keyframes armHandover {
                                            0%, 20% { transform: rotate(0deg); }
                                            80%, 100% { transform: rotate(18deg); }
                                        }
                                        @keyframes coinDrop {
                                            0% { opacity: 0; transform: translateY(-15px) scale(0.5); }
                                            50% { opacity: 1; transform: translateY(0) scale(1.1); }
                                            100% { opacity: 1; transform: translateY(0) scale(1); }
                                        }
                                        @keyframes toolSparkle {
                                            0%, 100% { opacity: 0; transform: scale(0.8); }
                                            50% { opacity: 1; transform: scale(1.2); }
                                        }
                                    `}
                                </style>

                                {/* Background */}
                                <rect x="20" y="20" width="260" height="160" rx="8" className="fill-[url(#shopBg)] dark:fill-[url(#shopBgDark)]" />

                                {/* Shelf & Items */}
                                <rect x="40" y="70" width="220" height="6" fill="#D97706" rx="3" />
                                <g transform="translate(60, 45)">
                                    {/* Box */}
                                    <rect x="0" y="0" width="30" height="25" fill="#EF4444" rx="2" />
                                    <rect x="5" y="5" width="20" height="8" fill="#FCA5A5" rx="1" />
                                    {/* Bucket */}
                                    <path d="M50 5 L70 5 L65 25 L55 25 Z" fill="#3B82F6" />
                                    <rect x="52" y="10" width="16" height="4" fill="#60A5FA" />
                                    {/* Stacked Cases */}
                                    <rect x="100" y="15" width="40" height="10" fill="#10B981" rx="1" />
                                    <rect x="110" y="2" width="20" height="13" fill="#F59E0B" rx="1" />
                                    {/* Paint Roller */}
                                    <rect x="160" y="10" width="25" height="15" fill="#94A3B8" rx="4" />
                                    <rect x="170" y="12" width="2" height="13" fill="#475569" />
                                </g>

                                {/* Counter */}
                                <path d="M 20 135 L 280 135 L 290 180 L 10 180 Z" fill="#B45309" />
                                <rect x="15" y="130" width="270" height="8" fill="#D97706" rx="2" />

                                {/* POS Machine */}
                                <rect x="40" y="115" width="35" height="15" fill="#374151" rx="2" />
                                <rect x="45" y="110" width="25" height="8" fill="#9CA3AF" rx="1" transform="rotate(-15 45 110)" />

                                {/* Shopkeeper base float */}
                                <g style={{ animation: 'shopkeeperFloat 3s ease-in-out infinite' }}>
                                    {/* Torso */}
                                    <path d="M125 130 L125 65 C125 45, 175 45, 175 65 L175 130 Z" fill="#2563EB" />
                                    {/* Apron */}
                                    <path d="M135 130 L135 75 L165 75 L165 130 Z" fill="#F59E0B" />
                                    <rect x="140" y="95" width="20" height="15" fill="#D97706" rx="2" />

                                    {/* Head */}
                                    <circle cx="150" cy="45" r="18" fill="#FDBA74" />
                                    {/* Cap */}
                                    <path d="M132 40 C132 25, 168 25, 168 40 L178 40 C178 45, 168 45, 168 45 Z" fill="#1F2937" />

                                    {/* Face Details */}
                                    <circle cx="143" cy="48" r="2.5" fill="#1F2937" />
                                    <circle cx="157" cy="48" r="2.5" fill="#1F2937" />
                                    {/* Mustache/Smile */}
                                    <path d="M145 56 Q150 62 155 56" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

                                    {/* Left Arm Resting */}
                                    <path d="M170 70 L185 105" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
                                    <circle cx="185" cy="105" r="8" fill="#FDBA74" />

                                    {/* Right Arm Animated (Handing tool box) */}
                                    <g style={{ animation: 'armHandover 2s infinite alternate ease-in-out', transformOrigin: '130px 70px' }}>
                                        <path d="M130 70 L95 90" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
                                        <circle cx="95" cy="90" r="8" fill="#FDBA74" />
                                        {/* Tool box in hand */}
                                        <rect x="70" y="70" width="35" height="25" fill="#EF4444" rx="3" transform="rotate(-20 85 80)" />
                                        <rect x="75" y="75" width="15" height="15" fill="#1F2937" rx="2" transform="rotate(-20 85 80)" />
                                        {/* Sparkle */}
                                        <g style={{ animation: 'toolSparkle 1.5s infinite alternate ease-in-out' }} transform="translate(65, 65)">
                                            <path d="M5 0 L5 10 M0 5 L10 5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
                                        </g>
                                    </g>
                                </g>

                                {/* Payment Coins */}
                                <g style={{ animation: 'coinDrop 1s infinite alternate ease-in-out', animationDelay: '0s' }} transform="translate(190, 120)">
                                    <circle cx="0" cy="0" r="8" fill="#FBBF24" />
                                    <circle cx="0" cy="0" r="5" fill="#F59E0B" />
                                    <text x="0" y="3" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">₹</text>
                                </g>
                                <g style={{ animation: 'coinDrop 1s infinite alternate ease-in-out', animationDelay: '0.3s' }} transform="translate(210, 122)">
                                    <circle cx="0" cy="0" r="8" fill="#FBBF24" />
                                    <circle cx="0" cy="0" r="5" fill="#F59E0B" />
                                    <text x="0" y="3" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">₹</text>
                                </g>
                                <g style={{ animation: 'coinDrop 1s infinite alternate ease-in-out', animationDelay: '0.6s' }} transform="translate(200, 125)">
                                    <circle cx="0" cy="0" r="8" fill="#FBBF24" />
                                    <circle cx="0" cy="0" r="5" fill="#F59E0B" />
                                    <text x="0" y="3" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">₹</text>
                                </g>
                            </svg>
                        </div>
                        <div className="p-2 md:p-6 text-center flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-[10px] sm:text-[11px] md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2 leading-tight">Sell with us</h3>
                                <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-500 dark:text-gray-400 mb-1.5 md:mb-4 leading-none hidden sm:block md:block">List products.</p>
                            </div>
                            <button className="text-orange-500 font-bold text-[8px] sm:text-[9px] md:text-sm flex items-center justify-center gap-0.5 md:gap-2 mx-auto group-hover:gap-1.5 md:group-hover:gap-3 transition-all mt-auto pt-1 md:pt-0">Start<span className="hidden md:inline">&nbsp;Selling</span> <ArrowRight className="w-2.5 h-2.5 md:w-4 md:h-4" /></button>
                        </div>
                    </div>

                    {/* Join as Professional */}
                    <div className="w-full flex-col flex bg-white dark:bg-slate-900 rounded-xl md:rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 md:hover:-translate-y-2 group cursor-pointer relative md:scale-105 z-10 border-blue-100 dark:border-blue-900">
                        <div className="h-20 sm:h-24 md:h-48 shrink-0 bg-blue-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                            <svg viewBox="0 0 300 200" className="w-full h-full max-w-[280px] relative z-10">
                                <defs>
                                    <linearGradient id="siteBg" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#EFF6FF" />
                                        <stop offset="100%" stopColor="#DBEAFE" />
                                    </linearGradient>
                                    <linearGradient id="siteBgDark" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#1E293B" />
                                        <stop offset="100%" stopColor="#0F172A" />
                                    </linearGradient>
                                </defs>
                                <style>
                                    {`
                                        @keyframes drillVibrate {
                                            0%, 100% { transform: rotate(0deg) translateX(0px); }
                                            50% { transform: rotate(-1deg) translateX(2px); }
                                        }
                                        @keyframes drillBitSpin {
                                            0% { stroke-dashoffset: 0; }
                                            100% { stroke-dashoffset: 10; }
                                        }
                                        @keyframes dustBurst {
                                            0% { opacity: 1; transform: translate(0, 0) scale(1); }
                                            100% { opacity: 0; transform: translate(-10px, 15px) scale(0); }
                                        }
                                    `}
                                </style>

                                {/* Background Wall */}
                                <rect x="20" y="20" width="260" height="160" rx="8" className="fill-[url(#siteBg)] dark:fill-[url(#siteBgDark)]" />
                                <path d="M40 50 L80 50 M60 70 L100 70 M200 50 L240 50 M180 70 L220 70" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

                                {/* Wall piece being drilled */}
                                <rect x="210" y="40" width="50" height="120" fill="#94A3B8" rx="4" />
                                <rect x="205" y="50" width="5" height="100" fill="#64748B" />

                                {/* Worker Container */}
                                <g transform="translate(130, 160)">
                                    {/* Legs */}
                                    <rect x="-15" y="-60" width="12" height="60" fill="#1E3A8A" rx="2" />
                                    <rect x="10" y="-60" width="12" height="60" fill="#1E3A8A" rx="2" />

                                    {/* Boots */}
                                    <path d="M -25 -5 L -5 -5 L -5 -15 L -20 -15 Z" fill="#78350F" />
                                    <path d="M 0 -5 L 20 -5 L 20 -15 L 5 -15 Z" fill="#78350F" />

                                    {/* Belt */}
                                    <rect x="-20" y="-65" width="45" height="8" fill="#92400E" rx="2" />
                                    <rect x="-15" y="-65" width="10" height="18" fill="#B45309" rx="2" />
                                    <rect x="5" y="-63" width="8" height="8" fill="#F59E0B" rx="1" />

                                    {/* Torso & Vest */}
                                    <path d="M-20 -120 L-20 -60 L25 -60 L25 -120 Z" fill="#3B82F6" />
                                    <path d="M-20 -120 L-20 -60 L25 -60 L25 -120 Z" fill="#EAB308" opacity="0.9" />
                                    <path d="M-20 -80 L25 -80 M-20 -100 L25 -100 M0 -120 L0 -60" stroke="#F1F5F9" strokeWidth="4" />

                                    {/* Back Arm */}
                                    <path d="M-10 -110 L-25 -80 L0 -70" stroke="#FDBA74" strokeWidth="12" strokeLinecap="round" fill="none" />
                                    <path d="M-10 -110 L-20 -90" stroke="#3B82F6" strokeWidth="14" strokeLinecap="round" fill="none" />

                                    {/* Head & Hat */}
                                    <circle cx="0" cy="-145" r="18" fill="#FDBA74" />
                                    <path d="M-22 -150 C-22 -175, 22 -175, 22 -150 L30 -150 C30 -145, 22 -145, 22 -145 L-22 -145 Z" fill="#F59E0B" />
                                    <rect x="-5" y="-168" width="10" height="5" fill="#D97706" rx="2" />

                                    {/* Face */}
                                    <circle cx="10" cy="-140" r="2.5" fill="#1F2937" />
                                    <rect x="-2" y="-145" width="20" height="8" fill="#93C5FD" rx="2" opacity="0.8" /> {/* Goggles */}
                                    <path d="M22 -135 Q18 -130 14 -135" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" fill="none" /> {/* Sweat/Effort */}

                                    {/* Right Arm & Drill Container (Vibrating cleanly together) */}
                                    <g style={{ animation: 'drillVibrate 0.1s infinite alternate ease-in-out', transformOrigin: '0px -110px' }}>
                                        {/* Forearm and Hand connecting to drill */}
                                        <path d="M5 -110 L30 -80 L50 -85" stroke="#FDBA74" strokeWidth="12" strokeLinecap="round" fill="none" />
                                        <path d="M5 -110 L25 -85" stroke="#3B82F6" strokeWidth="14" strokeLinecap="round" fill="none" />
                                        <circle cx="50" cy="-85" r="7" fill="#FDBA74" />

                                        {/* Plunging Power Drill */}
                                        <g transform="translate(45, -95)">
                                            <rect x="0" y="0" width="30" height="15" fill="#EF4444" rx="3" />
                                            <rect x="5" y="10" width="12" height="22" fill="#1F2937" rx="2" transform="rotate(-15 10 10)" />
                                            <rect x="3" y="28" width="16" height="8" fill="#111827" rx="2" transform="rotate(-15 10 10)" />
                                            <rect x="30" y="3" width="8" height="9" fill="#64748B" rx="1" />
                                            {/* Spinning Drill Bit */}
                                            <line x1="38" y1="7.5" x2="52" y2="7.5" stroke="#E2E8F0" strokeWidth="3" strokeDasharray="4,2" style={{ animation: 'drillBitSpin 0.2s infinite linear' }} />
                                        </g>
                                    </g>
                                </g>

                                {/* Dust Particles bursting from impact point (Fixed position at wall avoiding drill group rotation chaos) */}
                                <g transform="translate(205, 75)">
                                    <circle cx="0" cy="0" r="2.5" fill="#FCD34D" style={{ animation: 'dustBurst 0.3s infinite ease-out' }} />
                                    <circle cx="-2" cy="5" r="1.5" fill="#94A3B8" style={{ animation: 'dustBurst 0.4s infinite ease-out 0.1s' }} />
                                    <circle cx="2" cy="-3" r="2" fill="#F59E0B" style={{ animation: 'dustBurst 0.35s infinite ease-out 0.2s' }} />
                                    <circle cx="-5" cy="2" r="1" fill="#FFFFFF" style={{ animation: 'dustBurst 0.25s infinite ease-out 0.15s' }} />
                                </g>
                            </svg>
                        </div>
                        <div className="p-2 md:p-6 text-center flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-[10px] sm:text-[11px] md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2 leading-tight">Join as Pro</h3>
                                <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-500 dark:text-gray-400 mb-1.5 md:mb-4 leading-none hidden sm:block md:block">Get bookings.</p>
                            </div>
                            <button className="text-blue-600 dark:text-blue-400 font-bold text-[8px] sm:text-[9px] md:text-sm flex items-center justify-center gap-0.5 md:gap-2 mx-auto group-hover:gap-1.5 md:group-hover:gap-3 transition-all mt-auto pt-1 md:pt-0">Join<span className="hidden md:inline">&nbsp;Now</span> <ArrowRight className="w-2.5 h-2.5 md:w-4 md:h-4" /></button>
                        </div>
                    </div>

                    {/* Drive & Earn */}
                    <div className="w-full flex-col flex bg-white dark:bg-slate-900 rounded-xl md:rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 md:hover:-translate-y-2 group cursor-pointer relative">
                        <div className="h-20 sm:h-24 md:h-48 shrink-0 bg-green-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                            <svg viewBox="0 0 300 200" className="w-full h-full max-w-[280px] relative z-10">
                                <defs><clipPath id="roadClip"><rect x="0" y="160" width="300" height="40" /></clipPath></defs>
                                <g clipPath="url(#roadClip)"><rect x="0" y="160" width="300" height="40" fill="#E2E8F0" />
                                    <g className="animate-road-move"><rect x="0" y="178" width="50" height="4" fill="#94A3B8" /><rect x="100" y="178" width="50" height="4" fill="#94A3B8" /><rect x="200" y="178" width="50" height="4" fill="#94A3B8" /><rect x="300" y="178" width="50" height="4" fill="#94A3B8" /></g>
                                </g>
                                <g transform="translate(60, 90)">
                                    <g style={{ animation: 'car-bounce 0.8s ease-in-out infinite alternate' }}>
                                        <path d="M10 50 L15 30 Q30 10 60 10 L120 10 Q150 10 170 30 L180 50 L180 70 L10 70 Z" fill="#16A34A" stroke="#14532D" strokeWidth="1" />
                                        <path d="M60 15 L110 15 L110 35 L50 35 Z" fill="#1F2937" opacity="0.4" /><path d="M115 15 L145 18 L160 35 L115 35 Z" fill="#1F2937" opacity="0.4" />
                                        <path d="M175 50 L178 50 Q180 50 180 60 L175 60 Z" fill="#FBBF24" /><path d="M10 50 L12 50 L12 60 L10 60 Z" fill="#EF4444" />
                                    </g>
                                    <g transform="translate(48, 70)"><g className="animate-spin-fast"><circle cx="0" cy="0" r="14" fill="#1F2937" stroke="#374151" strokeWidth="3" /><circle cx="0" cy="0" r="8" fill="#9CA3AF" /></g></g>
                                    <g transform="translate(142, 70)"><g className="animate-spin-fast"><circle cx="0" cy="0" r="14" fill="#1F2937" stroke="#374151" strokeWidth="3" /><circle cx="0" cy="0" r="8" fill="#9CA3AF" /></g></g>
                                </g>
                            </svg>
                        </div>
                        <div className="p-2 md:p-6 text-center flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-[10px] sm:text-[11px] md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2 leading-tight">Drive & Earn</h3>
                                <p className="text-[8px] sm:text-[9px] md:text-sm text-gray-500 dark:text-gray-400 mb-1.5 md:mb-4 leading-none hidden sm:block md:block">Deliver tools.</p>
                            </div>
                            <button className="text-green-600 dark:text-green-400 font-bold text-[8px] sm:text-[9px] md:text-sm flex items-center justify-center gap-0.5 md:gap-2 mx-auto group-hover:gap-1.5 md:group-hover:gap-3 transition-all mt-auto pt-1 md:pt-0">Register <ArrowRight className="w-2.5 h-2.5 md:w-4 md:h-4" /></button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
