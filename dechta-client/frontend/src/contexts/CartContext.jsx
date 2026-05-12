import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState({});
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponApplied, setCouponApplied] = useState(false);

    const addToCart = useCallback((item, qty = 1) => {
        setCart(prev => {
            const existing = prev[item.id];
            if (existing) {
                return { ...prev, [item.id]: { ...existing, qty: existing.qty + qty } };
            }
            return { ...prev, [item.id]: { ...item, qty } };
        });
    }, []);

    const updateQty = useCallback((id, change) => {
        setCart(prev => {
            const item = prev[id];
            if (!item) return prev;
            const newQty = item.qty + change;
            if (newQty <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: { ...item, qty: newQty } };
        });
    }, []);

    const removeFromCart = useCallback((id) => {
        setCart(prev => {
            const { [id]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const clearCart = useCallback(() => {
        setCart({});
        setCouponDiscount(0);
        setCouponApplied(false);
    }, []);

    const applyCoupon = useCallback((code) => {
        if (code.toUpperCase() === 'QC20') {
            setCouponDiscount(20);
            setCouponApplied(true);
            return true;
        }
        return false;
    }, []);

    const cartItems = Object.values(cart);
    const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountAmount = couponApplied ? Math.round(cartTotal * couponDiscount / 100) : 0;
    const finalTotal = cartTotal - discountAmount;

    // Get highest delivery tier
    const getMaxTier = () => {
        let maxTier = 1;
        cartItems.forEach(item => {
            if (item.tier && item.tier > maxTier) maxTier = item.tier;
        });
        return maxTier;
    };

    return (
        <CartContext.Provider value={{
            cart, cartItems, cartCount, cartTotal, finalTotal, discountAmount,
            couponDiscount, couponApplied,
            addToCart, updateQty, removeFromCart, clearCart, applyCoupon, getMaxTier
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
