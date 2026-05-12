import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    CLIENT_TOKEN_KEY,
    getProfile,
    fetchAddresses as apiFetchAddresses,
    saveAddress as apiSaveAddress,
    deleteAddress as apiDeleteAddress
} from '../api/apiClient';

const AuthContext = createContext();

function readWalletState(phone) {
    try {
        const raw = localStorage.getItem(`dechta_wallet_${phone}`);
        if (!raw) return { balance: 0, transactions: [] };

        const parsed = JSON.parse(raw);
        return {
            balance: Number(parsed?.balance || 0),
            transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : []
        };
    } catch {
        return { balance: 0, transactions: [] };
    }
}

function isUnauthorizedError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.status === 401
        || message.includes('invalid token')
        || message.includes('no token provided')
        || message.includes('unauthorized');
}

function isNetworkLikeError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error instanceof TypeError
        || message.includes('failed to fetch')
        || message.includes('network')
        || message.includes('load failed');
}

export function AuthProvider({ children }) {
    // authLoading = true while we check localStorage for existing session
    // Prevents flash of login modal before we know if user is already logged in
    const [authLoading, setAuthLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({
        name: '', phone: '', email: '', initials: '', avatar: null,
        addresses: [], bookings: [], wishlist: [], wishlistFolders: [], ratings: {},
        walletBalance: 0, transactions: []
    });

    // ── Restore session on mount (same approach as vendor app) ──
    useEffect(() => {
        const token = localStorage.getItem(CLIENT_TOKEN_KEY);
        if (!token) {
            setAuthLoading(false);
            return;
        }

        // Token exists — fetch profile from backend to restore user data
        getProfile()
            .then(async (res) => {
                if (res.success && res.data) {
                    const { full_name, phone, email } = res.data;
                    const name = full_name || '';
                    const initials = name
                        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : String(phone || '').slice(-2) || 'U';
                    
                    // Load wallet data from localStorage
                    const savedWallet = readWalletState(phone);

                    setUserData(prev => ({ 
                        ...prev, 
                        name, 
                        phone: String(phone || ''), 
                        email: email || '', 
                        initials,
                        walletBalance: savedWallet.balance,
                        transactions: savedWallet.transactions
                    }));
                    setIsLoggedIn(true);

                    // Load addresses from backend
                    try {
                        const addrRes = await apiFetchAddresses();
                        if (addrRes.success && Array.isArray(addrRes.data)) {
                            setUserData(prev => ({
                                ...prev,
                                addresses: addrRes.data.map((a, i) => ({
                                    ...a,
                                    text: a.address_text,
                                    selected: i === 0 || a.is_default,
                                }))
                            }));
                        }
                    } catch { /* non-fatal */ }
                } else {
                    localStorage.removeItem(CLIENT_TOKEN_KEY);
                }
            })
            .catch((error) => {
                // Backend unreachable — try decoding token payload as fallback
                if (isUnauthorizedError(error)) {
                    localStorage.removeItem(CLIENT_TOKEN_KEY);
                    setIsLoggedIn(false);
                    return;
                }

                if (isNetworkLikeError(error)) {
                    try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const name = payload.name || '';
                    const phone = String(payload.phone || '');
                    const initials = name
                        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : phone.slice(-2) || 'U';
                    setUserData(prev => ({ ...prev, name, phone, initials }));
                    setIsLoggedIn(true);
                        return;
                    } catch {
                        // Fall through to token cleanup below.
                    }
                }

                localStorage.removeItem(CLIENT_TOKEN_KEY);
                setIsLoggedIn(false);
            })
            .finally(() => {
                setAuthLoading(false);
            });
    }, []);

    const login = useCallback((name, phone) => {
        const initials = name
            ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : String(phone).slice(-2);
        
        const savedWallet = readWalletState(phone);

        setUserData(prev => ({ 
            ...prev, 
            name, 
            phone: String(phone), 
            initials,
            walletBalance: savedWallet.balance,
            transactions: savedWallet.transactions
        }));
        setIsLoggedIn(true);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(CLIENT_TOKEN_KEY);
        setIsLoggedIn(false);
        setUserData({
            name: '', phone: '', email: '', initials: '', avatar: null,
            addresses: [], bookings: [], wishlist: [], wishlistFolders: [], ratings: {},
            walletBalance: 0, transactions: []
        });
    }, []);

    const updateProfile = useCallback((updates) => {
        setUserData(prev => {
            const updated = { ...prev, ...updates };
            if (updates.name) {
                updated.initials = updates.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            }
            return updated;
        });
    }, []);

    const addAddress = useCallback(async (address) => {
        try {
            // Persist to backend if user is logged in
            const token = localStorage.getItem(CLIENT_TOKEN_KEY);
            if (token) {
                const res = await apiSaveAddress({
                    tag: (address.tag || 'other').toLowerCase(),
                    address_text: address.text || address.address_text || '',
                    is_default: false,
                    lat: address.lat ?? null,
                    lng: address.lng ?? null,
                    area: address.area || '',
                    city: address.city || '',
                    state: address.state || '',
                    pincode: address.pincode || address.zip || '',
                    landmark: address.landmark || '',
                });
                if (res.success && res.data) {
                    setUserData(prev => ({
                        ...prev,
                        addresses: [
                            ...prev.addresses.map(a => ({ ...a, selected: false })),
                            { ...res.data, text: res.data.address_text, selected: true }
                        ]
                    }));
                    return;
                }
            }
        } catch (e) {
            console.warn('[AuthContext] addAddress backend failed, using local:', e.message);
        }
        // Fallback to local state (guest / offline)
        setUserData(prev => ({
            ...prev,
            addresses: [...prev.addresses, { ...address, id: Date.now(), selected: prev.addresses.length === 0 }]
        }));
    }, []);

    const selectAddress = useCallback((id) => {
        setUserData(prev => ({
            ...prev,
            addresses: prev.addresses.map(a => ({ ...a, selected: a.id === id }))
        }));
    }, []);

    const toggleWishlist = useCallback((productId) => {
        setUserData(prev => {
            const inMain = prev.wishlist.includes(productId);
            if (inMain) return { ...prev, wishlist: prev.wishlist.filter(id => id !== productId) };
            return { ...prev, wishlist: [...prev.wishlist, productId] };
        });
    }, []);

    const createWishlistFolder = useCallback((name) => {
        setUserData(prev => ({
            ...prev,
            wishlistFolders: [...(prev.wishlistFolders || []), { id: Date.now(), name, items: [] }]
        }));
    }, []);

    const addToWishlistFolder = useCallback((folderId, productId) => {
        setUserData(prev => ({
            ...prev,
            wishlist: prev.wishlist.filter(id => id !== productId),
            wishlistFolders: prev.wishlistFolders.map(f =>
                f.id === folderId
                    ? {
                        ...f,
                        items: Array.isArray(f.items)
                            ? (f.items.includes(productId) ? f.items : [...f.items, productId])
                            : [productId]
                    }
                    : f
            )
        }));
    }, []);

    const removeFromWishlistFolder = useCallback((folderId, productId) => {
        setUserData(prev => ({
            ...prev,
            wishlistFolders: prev.wishlistFolders.map(f =>
                f.id === folderId
                    ? { ...f, items: Array.isArray(f.items) ? f.items.filter(id => id !== productId) : [] }
                    : f
            )
        }));
    }, []);

    const deleteWishlistFolder = useCallback((folderId) => {
        setUserData(prev => {
            const folder = prev.wishlistFolders.find(f => f.id === folderId);
            const itemsToReturn = folder && Array.isArray(folder.items) ? folder.items : [];
            return {
                ...prev,
                wishlist: [...new Set([...prev.wishlist, ...itemsToReturn])],
                wishlistFolders: prev.wishlistFolders.filter(f => f.id !== folderId)
            };
        });
    }, []);

    const addBooking = useCallback((booking) => {
        setUserData(prev => ({ ...prev, bookings: [booking, ...prev.bookings] }));
    }, []);

    const setBookings = useCallback((bookings) => {
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        setUserData(prev => ({ ...prev, bookings: safeBookings }));
    }, []);

    const updateBookingStatus = useCallback((bookingId, status) => {
        setUserData(prev => ({
            ...prev,
            bookings: prev.bookings.map(b => b.id === bookingId ? { ...b, status } : b)
        }));
    }, []);

    const addProductRating = useCallback((productId, rating) => {
        setUserData(prev => ({
            ...prev,
            ratings: { ...prev.ratings, [productId]: rating }
        }));
    }, []);

    const topUpWallet = useCallback((amount) => {
        setUserData(prev => {
            const newBalance = prev.walletBalance + amount;
            const newTransaction = {
                id: Date.now(),
                type: 'credit',
                amount,
                description: 'Wallet Top-up',
                date: new Date().toISOString()
            };
            const newTransactions = [newTransaction, ...prev.transactions];
            
            // Persist
            localStorage.setItem(`dechta_wallet_${prev.phone}`, JSON.stringify({
                balance: newBalance,
                transactions: newTransactions
            }));

            return {
                ...prev,
                walletBalance: newBalance,
                transactions: newTransactions
            };
        });
    }, []);

    const payWithWallet = useCallback((amount, description) => {
        let success = false;
        setUserData(prev => {
            if (prev.walletBalance < amount) {
                success = false;
                return prev;
            }
            const newBalance = prev.walletBalance - amount;
            const newTransaction = {
                id: Date.now(),
                type: 'debit',
                amount,
                description: description || 'Payment',
                date: new Date().toISOString()
            };
            const newTransactions = [newTransaction, ...prev.transactions];
            
            // Persist
            localStorage.setItem(`dechta_wallet_${prev.phone}`, JSON.stringify({
                balance: newBalance,
                transactions: newTransactions
            }));

            success = true;
            return {
                ...prev,
                walletBalance: newBalance,
                transactions: newTransactions
            };
        });
        return success;
    }, []);

    const formatINR = useCallback((amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }, []);

    return (
        <AuthContext.Provider value={{
            authLoading,
            isLoggedIn, userData, login, logout, updateProfile,
            addAddress, selectAddress, toggleWishlist,
            createWishlistFolder, addToWishlistFolder, removeFromWishlistFolder, deleteWishlistFolder,
            addBooking, setBookings, updateBookingStatus, addProductRating,
            topUpWallet, payWithWallet, formatINR
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
