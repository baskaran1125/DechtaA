import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, ShoppingBag, Moon, Sun, MapPin, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { fetchSearchResults } from '../api/apiClient';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ allProducts = [], onOpenProduct, onCartClick, onLoginClick, onProfileClick, onWishlistClick, onBookingsClick, onSupportClick, onLogoClick }) {
    const { isDark, toggleTheme } = useTheme();
    const { cartCount } = useCart();
    const { isLoggedIn, userData } = useAuth();
    const { deliveryAddress, setLocationModalOpen } = useLocation();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState({ categories: [], products: [] });
    const [isLoading, setIsLoading] = useState(false);
    const searchContainerRef = useRef(null);
    const searchContainerMobileRef = useRef(null);
    const debounceRef = useRef(null);

    // Auto-typing placeholder state
    const [placeholder, setPlaceholder] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const phrases = [
        "Search for 'AC Repair'...",
        "Search for 'Painting'...",
        "Search for 'Plumbing'...",
        "Search for 'Drill Machine'...",
        "Search for 'Cleaning'..."
    ];

    useEffect(() => {
        if (isFocused) return;

        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingTimeout;

        const type = () => {
            const currentPhrase = phrases[phraseIndex];
            const currentText = isDeleting
                ? currentPhrase.substring(0, charIndex - 1)
                : currentPhrase.substring(0, charIndex + 1);

            setPlaceholder(currentText);

            if (!isDeleting) {
                charIndex++;
                if (charIndex === currentPhrase.length) {
                    isDeleting = true;
                    typingTimeout = setTimeout(type, 2000); // 2s wait at end (HTML parity)
                } else {
                    typingTimeout = setTimeout(type, 80); // 80ms type speed (HTML parity)
                }
            } else {
                charIndex--;
                if (charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    typingTimeout = setTimeout(type, 500); // 0.5s wait at start (HTML parity)
                } else {
                    typingTimeout = setTimeout(type, 40); // 40ms delete speed (HTML parity)
                }
            }
        };

        typingTimeout = setTimeout(type, 1000);

        return () => clearTimeout(typingTimeout);
    }, [isFocused]);

    // Backend search with debounce
    const searchBackend = useCallback((query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setSuggestions({ categories: [], products: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetchSearchResults(query);
                if (res.success && res.data) {
                    setSuggestions({
                        categories: res.data.suggested_categories || [],
                        products: res.data.products || []
                    });
                }
            } catch (e) {
                console.warn('[Search] Backend search failed:', e.message);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    }, []);

    // Handle search input changes
    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        searchBackend(query);
    };

    // Handle clicking a suggestion
    const handleSuggestionClick = (product) => {
        setSearchQuery('');
        setSuggestions({ categories: [], products: [] });
        setIsFocused(false);
        navigate(`/product/${product.id}`);
    };

    // Global click listener to close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target) &&
                searchContainerMobileRef.current && !searchContainerMobileRef.current.contains(event.target)) {
                setSuggestions({ categories: [], products: [] });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getProductImage = (item) => {
        if (Array.isArray(item.images) && item.images[0]) return item.images[0];
        if (typeof item.images === 'string' && item.images.startsWith('http')) return item.images;
        return item.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100';
    };

    // Truncate long address labels for display
    const addressLabel = deliveryAddress?.label || 'Select Delivery Location';
    const displayLabel = addressLabel.length > 32
        ? addressLabel.slice(0, 32) + '…'
        : addressLabel;

    const isDefaultAddress = addressLabel === 'Select Delivery Location';

    return (
        <nav className="fixed top-0 w-full bg-cyan-400 z-40 transition-all duration-300 pt-safe shadow-none border-none">
            {/* Desktop */}
            <div className="hidden lg:flex w-full px-10 items-center justify-between gap-8 h-20">
                <a href="#" className="flex items-center" onClick={(e) => { e.preventDefault(); onLogoClick(); }}>
                    <div className="bg-white rounded-xl shadow-md px-2 py-1 h-12 w-28 flex items-center justify-center overflow-hidden">
                        <img src="/dechta.png" className="h-full w-full object-contain transform scale-[2.5]" alt="Dechta" />
                    </div>
                </a>
                <button
                    onClick={() => setLocationModalOpen(true)}
                    aria-label="Change delivery address"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity group max-w-[260px]"
                >
                    <MapPin className="w-5 h-5 text-gray-800 shrink-0" strokeWidth={2.5} />
                    <span className={`text-sm font-bold truncate ${isDefaultAddress ? 'text-gray-700 italic' : 'text-gray-900 underline decoration-dotted underline-offset-4 decoration-gray-400'}`}>
                        {isDefaultAddress ? 'Setup your precise location' : displayLabel}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-600 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                </button>
                <div className="flex-1 max-w-2xl mx-auto relative group" ref={searchContainerRef}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearch}
                        placeholder={isFocused && !searchQuery ? "Search for services..." : searchQuery ? "" : placeholder}
                        onFocus={() => setIsFocused(true)}
                        className="w-full h-12 bg-gray-100 dark:bg-slate-900 rounded-xl pl-12 pr-4 font-medium text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:shadow-lg transition-all"
                    />

                    {/* Desktop Search Suggestions Dropdown */}
                    {(suggestions?.categories?.length > 0 || suggestions?.products?.length > 0 || isLoading) && isFocused && (
                        <div className="absolute top-14 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">

                            {isLoading && (
                                <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                    Searching...
                                </div>
                            )}

                            {!isLoading && suggestions?.categories?.length > 0 && (
                                <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 p-2">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Suggested Categories</div>
                                    {suggestions.categories.map((cat) => (
                                        <div
                                            key={cat.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setSearchQuery('');
                                                setSuggestions({ categories: [], products: [] });
                                                setIsFocused(false);
                                                navigate(`/category/${cat.id}`);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-slate-800 cursor-pointer rounded-lg transition-colors"
                                        >
                                            <Search className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{cat.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && suggestions?.products?.length > 0 && (
                                <div className="p-2">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 mt-1">Products</div>
                                    {suggestions.products.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSuggestionClick(item)}
                                            className="flex items-center gap-4 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-lg"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                                                <img src={getProductImage(item)} alt={item.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{item.category || (item.is_bulk ? 'Bulk Order' : 'Product')}</p>
                                            </div>
                                            <div className="font-bold text-sm text-cyan-600 dark:text-cyan-400">
                                                ₹{(item.selling_price || item.price || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && suggestions?.categories?.length === 0 && suggestions?.products?.length === 0 && searchQuery && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No results found for "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-6">
                    <button id="navbar-wishlist-icon" onClick={onWishlistClick} className="font-bold text-sm hover:text-gray-600">Wishlists</button>
                    <button onClick={onBookingsClick} className="font-bold text-sm hover:text-gray-600">Bookings</button>
                    <button onClick={onSupportClick} className="font-bold text-sm hover:text-gray-600">Support</button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-800"></div>
                    <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                        {isDark ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-gray-700" />}
                    </button>
                    <button onClick={onCartClick} className="relative p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full">
                        <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                        {cartCount > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-black text-white text-xs font-bold flex items-center justify-center rounded-full">{cartCount}</span>}
                    </button>
                    {isLoggedIn ? (
                        <button onClick={onProfileClick} className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">{userData.initials}</button>
                    ) : (
                        <button onClick={onLoginClick} className="bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-md">Login</button>
                    )}
                </div>
            </div>
            {/* Mobile */}
            <div className="lg:hidden w-full">
                <div className="w-full h-16 px-4 flex items-center gap-3 relative z-50">
                    <a href="#" className="shrink-0 flex items-center" onClick={(e) => { e.preventDefault(); onLogoClick(); }}>
                        <div className="bg-white rounded-lg shadow-sm px-2 py-1 h-10 w-24 flex items-center justify-center overflow-hidden">
                            <img src="/dechta.png" className="h-full w-full object-contain transform scale-[2.5]" alt="Dechta" />
                        </div>
                    </a>
                    <div className="flex-1 relative" ref={searchContainerMobileRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder={isFocused && !searchQuery ? "Search..." : searchQuery ? "" : placeholder}
                            onFocus={() => setIsFocused(true)}
                            className="w-full h-10 bg-gray-100 dark:bg-slate-900 rounded-lg pl-9 pr-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:text-white"
                        />

                        {/* Mobile Search Suggestions Dropdown */}
                        {(suggestions?.categories?.length > 0 || suggestions?.products?.length > 0 || isLoading) && isFocused && (
                            <div className="absolute top-12 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto">

                                {isLoading && (
                                    <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {!isLoading && suggestions?.categories?.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 p-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Categories</div>
                                        {suggestions.categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSearchQuery('');
                                                    setSuggestions({ categories: [], products: [] });
                                                    setIsFocused(false);
                                                    navigate(`/category/${cat.id}`);
                                                }}
                                                className="flex items-center gap-2 px-2 py-2 hover:bg-gray-200 dark:hover:bg-slate-800 cursor-pointer rounded-md transition-colors"
                                            >
                                                <Search className="w-3 h-3 text-gray-400" />
                                                <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">{cat.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoading && suggestions?.products?.length > 0 && (
                                    <div className="p-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 mt-1">Products</div>
                                        {suggestions.products.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleSuggestionClick(item)}
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors rounded-md"
                                            >
                                                <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                                                    <img src={getProductImage(item)} alt={item.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate capitalize">{item.category || (item.is_bulk ? 'Bulk Order' : 'Product')}</p>
                                                </div>
                                                <div className="font-bold text-[13px] text-cyan-600 dark:text-cyan-400">
                                                    ₹{(item.selling_price || item.price || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoading && suggestions?.categories?.length === 0 && suggestions?.products?.length === 0 && searchQuery && (
                                    <div className="p-3 text-center text-xs text-gray-500">
                                        No results
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={onCartClick} className="relative shrink-0 p-1">
                        <ShoppingBag className="w-6 h-6 text-gray-900 dark:text-white" />
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full">{cartCount}</span>}
                    </button>
                </div>

                {/* Mobile Location Bar */}
                <button
                    onClick={() => setLocationModalOpen(true)}
                    aria-label="Change delivery address"
                    className="w-full flex items-center gap-2 px-4 py-1.5 hover:opacity-80 transition-opacity"
                >
                    <MapPin className="w-4 h-4 text-gray-800 shrink-0" strokeWidth={2.5} />
                    <span className={`text-[11px] font-bold truncate ${isDefaultAddress ? 'text-gray-600 italic' : 'text-gray-900'}`}>
                        {isDefaultAddress ? 'Setup your precise location' : displayLabel}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-600 shrink-0 ml-auto" />
                </button>
            </div>
        </nav>
    );
}
