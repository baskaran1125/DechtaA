import { X, ShoppingBag, Tag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';

export default function CartDrawer({ open, onClose, onCheckout, onProductClick }) {
    const { cartItems, cartCount, cartTotal, finalTotal, discountAmount, couponApplied, updateQty, removeFromCart, applyCoupon } = useCart();
    const [couponInput, setCouponInput] = useState('');
    const [couponMsg, setCouponMsg] = useState('');

    const handleApply = () => {
        if (applyCoupon(couponInput)) {
            setCouponMsg('Coupon Applied Successfully!');
        } else {
            setCouponMsg('Invalid coupon code');
        }
    };

    return (
        <div style={{ transform: open ? 'translateX(0)' : 'translateX(120%)' }}
            className="fixed top-24 right-4 md:right-8 w-[calc(100%-2rem)] md:w-[400px] max-h-[80vh] bg-white dark:bg-slate-900 z-[200] transition-transform duration-300 shadow-2xl flex flex-col rounded-3xl border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Your Cart</h2>
                <button onClick={onClose}><X className="w-6 h-6 text-gray-400 hover:text-black dark:hover:text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[150px]">
                {cartItems.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Your cart is empty</p>
                    </div>
                ) : cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
                        <div onClick={() => onProductClick(item)} className="cursor-pointer hover:opacity-80 transition-opacity">
                            <img src={item.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100'} className="w-16 h-16 object-contain rounded-lg bg-white dark:bg-slate-700 p-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 onClick={() => onProductClick(item)} className="font-bold text-sm dark:text-white truncate cursor-pointer hover:underline">{item.name}</h4>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                            <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 font-bold text-sm hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg">-</button>
                            <span className="text-sm font-bold min-w-[20px] text-center dark:text-white">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 font-bold text-sm hover:bg-gray-100 dark:hover:bg-slate-600 rounded-r-lg">+</button>
                        </div>
                    </div>
                ))}
            </div>
            {cartItems.length > 0 && (
                <>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Coupon Code (Try 'QC20')" value={couponInput} onChange={e => setCouponInput(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold uppercase focus:outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            </div>
                            <button onClick={handleApply} className="text-sm font-bold px-4 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors dark:text-white">APPLY</button>
                        </div>
                        {couponMsg && <p className={`text-xs font-bold mt-2 ${couponApplied ? 'text-green-600' : 'text-red-500'}`}>{couponMsg}</p>}
                    </div>
                    <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-3xl">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-medium text-gray-500 dark:text-gray-400">Total</span>
                            <span className="font-black text-2xl dark:text-white">₹{finalTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <button onClick={onCheckout} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg">Checkout</button>
                    </div>
                </>
            )}
        </div>
    );
}
