import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Heart } from 'lucide-react';
import { fetchProducts } from '../api/apiClient';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function CategoryPage({ onOpenProduct, onAddToCart, onWishlistClick, onNotifyClick }) {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const { cart, updateQty } = useCart();
    const { userData } = useAuth();
    
    useEffect(() => {
        setLoading(true);
        fetchProducts({ category: categoryId })
            .then(res => {
                if(res.success && Array.isArray(res.data)) {
                    setProducts(res.data);
                } else {
                    setProducts([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch category products:", err);
                setProducts([]);
            })
            .finally(() => setLoading(false));
    }, [categoryId]);

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
        const isLiked = userData?.wishlist?.includes(item.id) || userData?.wishlist?.includes(String(item.id)) || userData.wishlistFolders?.some(f => Array.isArray(f.items) && f.items.includes(item.id));

        return (
            <div key={item.id} className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg md:rounded-xl p-1.5 md:p-2 flex flex-col group cursor-pointer hover:shadow-md transition-all duration-300 relative"
                onClick={() => onOpenProduct(item)}>
                <div className="relative w-full aspect-[4/3] md:aspect-square bg-gray-50/50 dark:bg-slate-800/50 rounded-md md:rounded-lg mb-1.5 md:mb-2 flex flex-col items-center justify-center p-1 md:p-2 overflow-hidden">
                    <img src={getImg(item)} className="w-[80%] h-[80%] md:w-full md:h-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-105 transition-transform duration-500" onError={e => e.target.src = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'} alt={item.name} />
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
                                onAddToCart({ id: item.id, name: item.name, price, img: getImg(item), tier: item.tier || 1 });
                            }} className="h-6 px-3 bg-white text-cyan-600 border border-cyan-200 rounded text-[9px] font-bold uppercase shadow-sm">ADD</button>
                        )}
                    </div>
                </div>
                <div className="flex flex-col flex-1 px-1">
                    <span className="text-[8px] md:text-[9px] text-gray-400 font-bold mb-0.5">1 piece</span>
                    <h3 className="font-bold text-[10px] md:text-[12px] text-gray-800 dark:text-gray-200 leading-[1.2] line-clamp-2 md:min-h-[28px] mb-1 group-hover:text-cyan-600 transition-colors">{item.name}</h3>
                    <div className="flex items-end justify-between mt-auto w-full pt-1">
                        <div className="flex flex-col">
                            {savings > 0 ? <span className="text-[8px] md:text-[9px] text-gray-400 line-through mb-[1px]">₹{mrp.toLocaleString('en-IN')}</span> : <div className="h-[12px] md:h-[13px] mb-[1px]" />}
                            <span className="font-bold text-[11px] md:text-sm text-black dark:text-white leading-none">₹{price.toLocaleString('en-IN')}</span>
                        </div>
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
                                <button onClick={() => onAddToCart({ id: item.id, name: item.name, price, img: getImg(item), tier: item.tier || 1 })}
                                    className="h-7 px-4 bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-lg text-[10px] font-bold uppercase transition-colors shadow-sm">ADD</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 pt-44 lg:pt-36 pb-24 min-h-screen relative z-20">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate('/')} 
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-800 dark:text-white" />
                </button>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white capitalize">
                    {categoryId} Products
                </h1>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {products.map(p => (
                        <div key={p.id}>
                            {renderProductCard(p)}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No products found for "{categoryId}"</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-sm">
                        Try exploring other categories or check back later for new arrivals.
                    </p>
                    <button 
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold transition-colors shadow-md"
                    >
                        Browse All Products
                    </button>
                </div>
            )}
        </div>
    );
}
