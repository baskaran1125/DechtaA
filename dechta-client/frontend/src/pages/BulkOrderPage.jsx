import { useState, useMemo } from 'react';
import { ArrowLeft, Box, ShoppingBag, Info, Truck, Scale, ShieldCheck, Star } from 'lucide-react';
import { bulkMaterials } from '../data/products';
import { useCart } from '../contexts/CartContext';

export default function BulkOrderPage({ onBack, onAddToCart }) {
    const [quantities, setQuantities] = useState({});
    const [activeTab, setActiveTab] = useState('all');

    const filteredMaterials = useMemo(() => {
        if (activeTab === 'all') return bulkMaterials;
        return bulkMaterials.filter(m => m.type === activeTab);
    }, [activeTab]);

    const handleQtyChange = (id, val) => {
        const num = parseInt(val) || 0;
        setQuantities(prev => ({ ...prev, [id]: num }));
    };

    const handleAdd = (material) => {
        const qty = quantities[material.id] || material.minOrder;
        if (qty < material.minOrder) {
            alert(`Minimum order for ${material.name} is ${material.minOrder} ${material.unit}s`);
            return;
        }
        onAddToCart({
            id: material.id,
            name: material.name,
            price: material.price,
            img: material.img,
            unit: material.unit,
            isBulk: true,
            tier: 3 // Bulk orders are always heavy
        }, qty);
    };

    return (
        <main className="w-full min-h-screen bg-gray-50 dark:bg-slate-950 font-sans animate-slide-in-right pb-24 md:pb-10 z-50 relative pt-16 md:pt-28">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40 px-4 h-14 md:h-20 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 shadow-sm">
                <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </button>
                <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Bulk Order - Sand & Bricks</h1>
                <div className="w-10"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6">
                {/* Header Section */}
                <div className="mb-8 p-6 md:p-10 bg-gradient-to-br from-gray-900 to-slate-900 dark:from-slate-900 dark:to-black rounded-3xl text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <span className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mb-3 block">Construction Materials</span>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">Order Loads <br /><span className="text-gray-400">by Kilograms</span></h2>
                        <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                            Order high-quality aggregates and bricks in bulk. Enter your required quantity in kilograms or units and get instant delivery to your site.
                        </p>
                    </div>
                    <Box className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto hide-scroll pb-2">
                    {['all', 'sand', 'bricks', 'cement'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${activeTab === tab
                                ? 'bg-cyan-600 border-cyan-600 text-white shadow-lg'
                                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:border-cyan-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map(material => (
                        <div key={material.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col group">
                            <div className="aspect-video bg-gray-50 dark:bg-slate-800/50 rounded-2xl mb-4 overflow-hidden relative p-4 flex items-center justify-center">
                                <img src={material.img} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-110 transition-transform duration-500" alt={material.name} />
                                <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-cyan-600 shadow-sm border border-gray-100 dark:border-slate-800">
                                    ₹{material.price}/{material.unit}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{material.name}</h3>

                            <div className="flex items-center gap-2 mb-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <Truck className="w-3.5 h-3.5" />
                                <span>Immediate Site Delivery</span>
                            </div>

                            <div className="mt-auto space-y-4">
                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Quantity ({material.unit}s)</span>
                                        <span className="text-[10px] font-bold text-cyan-600">Min: {material.minOrder} {material.unit}s</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Scale className="w-5 h-5 text-gray-400" />
                                        <input
                                            type="number"
                                            min={material.minOrder}
                                            value={quantities[material.id] || ''}
                                            onChange={(e) => handleQtyChange(material.id, e.target.value)}
                                            placeholder={`Ex: ${material.minOrder}`}
                                            className="w-full bg-transparent border-none focus:ring-0 text-xl font-black text-gray-900 dark:text-white p-0"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAdd(material)}
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-[0.98] transition-all"
                                >
                                    <ShoppingBag className="w-5 h-5" /> ADD LOAD TO CART
                                </button>

                                <div className="text-center">
                                    <span className="text-[10px] text-gray-400 font-medium">Estimated Total: <b className="text-gray-900 dark:text-white">₹{((quantities[material.id] || material.minOrder) * material.price).toLocaleString()}</b></span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info Footer */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { icon: ShieldCheck, title: "Quality Guarantee", desc: "All materials are tested for strength and purity before dispatch." },
                        { icon: Scale, title: "Precision Weighing", desc: "Digital weighing scales at yard ensuring accurate loading of your order." },
                        { icon: Info, title: "Bulk Discount", desc: "Order more than 5000 kgs to get additional 5% discount on total price." }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                                <item.icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
