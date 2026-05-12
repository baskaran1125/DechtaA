import { ArrowLeft, Star, ShoppingBag, Heart, Sparkles, Shield, Award, Box, Truck, Info, Store, ShieldCheck, Share2, Bell, Timer, Users, Zap, ChevronRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import gsap from 'gsap';

export default function ProductPage({ product, onBack, onAddToCart, onBuyNow, onWishlistClick, onNotifyClick, allProducts = [], onOpenProduct }) {
    const { cart, updateQty } = useCart();
    const { userData, addProductRating } = useAuth();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [product?.id]);

    const deliveryTime = useMemo(() => Math.floor(9 + Math.random() * 10), [product?.id]);

    const [activeIndex, setActiveIndex] = useState(0);
    const mainImageRef = useRef(null);

    const handleRatingClick = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const hasBought = userData.bookings?.some(b =>
            b.items?.some(i => String(i.id) === String(product?.id))
        );

        if (hasBought) {
            const rat = window.prompt("Rate this product (1-5):", "5");
            if (rat && !isNaN(rat)) {
                const rVal = parseInt(rat);
                if (rVal >= 1 && rVal <= 5) {
                    addProductRating(product?.id, rVal);
                }
            }
        } else {
            window.alert("Buy the product to rate!");
        }
    }, [userData.bookings, product?.id, addProductRating]);

    const price = Number(product?.selling_price || product?.price) || 0;
    const mrp = Number(product?.mrp) || Math.round(price * 1.2);
    const savings = mrp - price;
    const pct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
    const qty = product ? (cart[product.id]?.qty || 0) : 0;
    const mainWishlist = Array.isArray(userData.wishlist) ? userData.wishlist : [];
    const isLiked = product ? (mainWishlist.includes(product.id) || userData.wishlistFolders?.some(f => Array.isArray(f.items) && f.items.includes(product.id))) : false;

    const allImages = useMemo(() => {
        if (!product) return [];

        const imgs = Array.isArray(product.images) ? product.images : (product.img ? [product.img] : []);
        const placeholders = [
            'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
            'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
            'https://images.unsplash.com/photo-1503387762-11a0fcfbd307?w=800'
        ];

        let final = [...imgs];
        let i = 0;
        while (final.length < 3) {
            final.push(placeholders[i % placeholders.length]);
            i++;
        }
        return final.slice(0, 3);
    }, [product]);

    // ── Similar products (same category, exclude current) ────
    const similarProducts = useMemo(() => {
        if (!product?.category || !allProducts.length) return [];
        return allProducts
            .filter(p => p.category === product.category && String(p.id) !== String(product.id))
            .slice(0, 12);
    }, [product, allProducts]);

    const handleImageChange = (index) => {
        if (index === activeIndex) return;
        const tl = gsap.timeline();
        tl.to(mainImageRef.current, {
            opacity: 0, scale: 0.95, duration: 0.2, ease: "power2.in",
            onComplete: () => setActiveIndex(index)
        });
        tl.to(mainImageRef.current, {
            opacity: 1, scale: 1, duration: 0.4, ease: "power2.out"
        });
    };

    const getImg = () => allImages[activeIndex];

    const getSimilarImg = (p) => {
        if (Array.isArray(p.images) && p.images[0]) return p.images[0];
        return p.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200';
    };

    const maskName = (str) => {
        if (!str) return "xxxx xxxx";
        const parts = str.split(' ');
        if (parts.length > 1) return `${parts[0]} xxxx`;
        const half = Math.ceil(str.length / 2);
        return str.substring(0, half) + "xxxx";
    };

    const shopName = product.vendorName || "Ganesh Hardwares";

    const handleBuyNow = () => {
        if (!product) return;

        if (qty === 0) {
            onAddToCart({ id: product.id, name: product.name, price, img: getImg(), tier: 1 });
        }
        onBuyNow?.({ id: product.id, name: product.name, price, img: getImg(), tier: 1 });
    };

    if (!product) return null;

    return (
        <main className="w-full min-h-screen bg-gray-50 dark:bg-slate-950 font-sans animate-slide-in-right pb-24 md:pb-10 z-50 relative pt-16 md:pt-28">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40 px-4 h-14 md:h-20 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 shadow-sm">
                <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </button>
                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        <Share2 className="w-4 h-4 text-gray-800 dark:text-gray-200" />
                    </button>
                    <button onClick={(e) => onWishlistClick(product, e)} className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-sm ${isLiked ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-white/80 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 hover:text-red-500'}`}>
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-0 md:px-6">
                <div className="flex flex-col md:flex-row bg-white dark:bg-slate-900 md:rounded-3xl md:shadow-sm md:border border-gray-100 dark:border-slate-800 overflow-hidden">

                    {/* Left Column: Image & Basic Info */}
                    <div className="w-full md:w-1/2 p-4 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800 flex flex-col items-center">
                        <div className="w-full flex gap-4 mb-8 h-[350px] md:h-[450px]">
                            {/* Thumbnails Sidebar */}
                            <div className="flex flex-col gap-3 shrink-0">
                                {allImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleImageChange(idx)}
                                        className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl border-2 overflow-hidden transition-all duration-300 ${activeIndex === idx ? 'border-cyan-500 shadow-lg scale-105' : 'border-transparent bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt={`view-${idx}`} />
                                    </button>
                                ))}
                            </div>

                            {/* Main Image Display */}
                            <div className="flex-1 bg-gray-50/50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center p-6 relative overflow-hidden">
                                {product.tag && <div className="absolute top-4 left-4 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">{product.tag}</div>}
                                <img
                                    ref={mainImageRef}
                                    src={getImg()}
                                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                                    alt={product.name}
                                />
                            </div>
                        </div>

                        <div className="w-full text-left relative">
                            {product.outOfStock && (
                                <div className="absolute right-0 top-0 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Out of Stock
                                </div>
                            )}
                            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2 block">{product.category || 'Hardware'}</span>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-2 pr-24">{product.name}</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-normal mb-6">
                                {product.description || product.specs || "Premium Grade / Professional Choice / High Durability"}
                            </p>
                            {(product.description || (product.length_cm && product.width_cm && product.height_cm)) && (
                                <div className="mt-2 mb-4 space-y-1">
                                    {product.length_cm && product.width_cm && product.height_cm && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            ({product.length_cm}cm &times; {product.width_cm}cm &times; {product.height_cm}cm)
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div onClick={handleRatingClick} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1 shadow-sm cursor-pointer transition-colors active:scale-95">
                                    4.8 <Star className="w-3 h-3 fill-current" />
                                </div>
                                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">1,245 Ratings</span>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 hidden md:block"></div>
                                {userData.ratings?.[product.id] ? (
                                    <div className="flex items-center gap-1.5 bg-yellow-400/10 dark:bg-yellow-400/5 px-3 py-1 rounded-lg border border-yellow-400/20">
                                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Your Rating:</span>
                                        <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`w-3 h-3 ${s <= userData.ratings[product.id] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 p-1 rounded-lg transition-colors"
                                        onClick={handleRatingClick}>
                                        <span className="text-xs font-bold text-cyan-600 group-hover:underline">Rate Product</span>
                                        <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 text-gray-300" />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing, Actions, Details */}
                    <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">

                        {/* Price & Buttons (Desktop) */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-end gap-3">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white leading-none">₹{price.toLocaleString('en-IN')}</span>
                                    {savings > 0 && <span className="text-xl text-gray-400 line-through font-medium leading-none mb-1">₹{mrp.toLocaleString('en-IN')}</span>}
                                    {pct > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full mb-1">{pct}% OFF</span>}
                                </div>
                                <div className="flex items-center gap-1.5 bg-cyan-100/50 dark:bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-200/50 dark:border-cyan-500/20">
                                    <Timer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                    <span className="text-[11px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-tight">{deliveryTime} MINS</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mb-6">Inclusive of all taxes</p>

                            {/* Desktop: Add to Cart + Buy Now */}
                            <div className="hidden md:flex gap-3">
                                {product.outOfStock ? (
                                    <button onClick={() => onNotifyClick(product)}
                                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                                        <Bell className="w-5 h-5 flex-shrink-0" /> NOTIFY WHEN AVAILABLE
                                    </button>
                                ) : qty > 0 ? (
                                    <>
                                        <div className="flex items-center h-14 w-[160px] bg-cyan-600 rounded-xl shadow-lg overflow-hidden shrink-0">
                                            <button onClick={() => updateQty(product.id, -1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-xl">-</button>
                                            <span className="w-1/3 font-bold text-white text-center text-lg">{qty}</span>
                                            <button onClick={() => updateQty(product.id, 1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-xl">+</button>
                                        </div>
                                        <button onClick={handleBuyNow}
                                            className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                                            <Zap className="w-5 h-5" /> Buy Now
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => onAddToCart({ id: product.id, name: product.name, price, img: getImg(), tier: 1 })}
                                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-lg shadow-cyan-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                                            <ShoppingBag className="w-5 h-5 flex-shrink-0" /> Add To Cart
                                        </button>
                                        <button onClick={handleBuyNow}
                                            className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                                            <Zap className="w-5 h-5" /> Buy Now
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="flex items-center gap-4 mb-8 bg-cyan-50/50 dark:bg-cyan-900/10 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-900/30">
                            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/40 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Superfast Delivery</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Order now and get it delivered in minutes.</p>
                            </div>
                        </div>

                        {/* Highlights Grid */}
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Highlights</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: Shield,     label: 'Brand',        value: product.brand           || 'N/A' },
                                    { icon: Award,      label: 'Quality Grade', value: product.product_quality  || 'Standard Grade' },
                                    { icon: Store,      label: 'Shop Name',     value: maskName(shopName) },
                                    { icon: ShieldCheck,label: 'Warranty',      value: product.warranty         || 'No Warranty' },
                                ].map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                        <div className="text-cyan-600 dark:text-cyan-400"><h.icon className="w-4 h-4" /></div>
                                        <div>
                                            <span className="text-gray-400 text-[9px] uppercase font-bold block leading-none">{h.label}</span>
                                            <span className="font-bold text-xs text-gray-800 dark:text-gray-200 mt-0.5 block leading-none">{h.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Info className="w-5 h-5 text-gray-400" /> Description
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                                {product.detailed_description || product.description || `High-quality ${product.name} designed specifically for professional hardware use. Manufactured with premium materials to ensure durability and reliability on the job site. Backed by a full guarantee.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* Similar Products Section                                  */}
                {/* ══════════════════════════════════════════════════════════ */}
                {similarProducts.length > 0 && (
                    <div className="mt-6 md:mt-10 px-4 md:px-0 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                                More in <span className="text-cyan-600 dark:text-cyan-400 capitalize">{product.category}</span>
                            </h2>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{similarProducts.length} items</span>
                        </div>

                        {/* Scrollable row on mobile, grid on desktop */}
                        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                            {similarProducts.map(sp => {
                                const spPrice = Number(sp.selling_price || sp.price) || 0;
                                const spMrp = Number(sp.mrp) || Math.round(spPrice * 1.2);
                                const spPct = spMrp > 0 ? Math.round(((spMrp - spPrice) / spMrp) * 100) : 0;
                                const spQty = cart[sp.id]?.qty || 0;

                                return (
                                    <div
                                        key={sp.id}
                                        className="min-w-[160px] md:min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col"
                                        onClick={() => onOpenProduct?.(sp)}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-square bg-gray-50 dark:bg-slate-800/50 p-3 flex items-center justify-center overflow-hidden">
                                            {spPct > 0 && (
                                                <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">{spPct}%</span>
                                            )}
                                            <img
                                                src={getSimilarImg(sp)}
                                                alt={sp.name}
                                                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="p-3 flex-1 flex flex-col">
                                            <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight mb-1.5">{sp.name}</p>
                                            <div className="flex items-end gap-1.5 mt-auto">
                                                <span className="text-base font-black text-gray-900 dark:text-white">₹{spPrice.toLocaleString('en-IN')}</span>
                                                {spMrp > spPrice && (
                                                    <span className="text-[11px] text-gray-400 line-through mb-0.5">₹{spMrp.toLocaleString('en-IN')}</span>
                                                )}
                                            </div>

                                            {/* Add to Cart / Qty */}
                                            <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                                                {sp.outOfStock ? (
                                                    <span className="text-[10px] font-bold text-red-500 uppercase">Out of Stock</span>
                                                ) : spQty > 0 ? (
                                                    <div className="flex items-center h-8 bg-cyan-600 rounded-lg overflow-hidden">
                                                        <button onClick={() => updateQty(sp.id, -1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-sm">−</button>
                                                        <span className="w-1/3 font-bold text-white text-center text-xs">{spQty}</span>
                                                        <button onClick={() => updateQty(sp.id, 1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-sm">+</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => onAddToCart({ id: sp.id, name: sp.name, price: spPrice, img: getSimilarImg(sp), tier: 1 })}
                                                        className="w-full h-8 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-cyan-200 dark:border-cyan-800/50 transition-colors"
                                                    >
                                                        <ShoppingBag className="w-3.5 h-3.5" /> Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Bar — Add to Cart + Buy Now */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 py-3 pb-safe z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                    {/* Price */}
                    <div className="flex flex-col shrink-0 min-w-[80px]">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white leading-tight">₹{price.toLocaleString('en-IN')}</span>
                        {savings > 0 && <span className="text-[10px] text-gray-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>}
                    </div>

                    {/* Buttons */}
                    <div className="flex-1 flex gap-2">
                        {product.outOfStock ? (
                            <button onClick={() => onNotifyClick(product)}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 rounded-xl text-[11px] font-bold shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wide">
                                <Bell className="w-4 h-4" /> NOTIFY
                            </button>
                        ) : qty > 0 ? (
                            <>
                                <div className="flex items-center h-12 w-[110px] bg-cyan-600 rounded-xl shadow-lg overflow-hidden shrink-0">
                                    <button onClick={() => updateQty(product.id, -1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-lg">−</button>
                                    <span className="w-1/3 font-bold text-white text-center text-sm">{qty}</span>
                                    <button onClick={() => updateQty(product.id, 1)} className="w-1/3 h-full flex items-center justify-center font-black text-white text-lg">+</button>
                                </div>
                                <button onClick={handleBuyNow}
                                    className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white h-12 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 uppercase">
                                    <Zap className="w-4 h-4" /> Buy Now
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onAddToCart({ id: product.id, name: product.name, price, img: getImg(), tier: 1 })}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wide">
                                    <ShoppingBag className="w-4 h-4" /> Add
                                </button>
                                <button onClick={handleBuyNow}
                                    className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white h-12 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 uppercase">
                                    <Zap className="w-4 h-4" /> Buy Now
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}