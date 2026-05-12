import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { useCart } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { useLocation } from './contexts/LocationContext';
import { hardware, services, serviceData } from './data/products';
import { fetchProducts, fetchActiveVendors, fetchVendorProducts, placeOrder, fetchGroupedProducts, fetchMyOrders } from './api/apiClient';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import CategoryBar from './components/CategoryBar';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import InteriorsPage from './pages/InteriorsPage';
import BulkOrderPage from './pages/BulkOrderPage';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import LoginModal from './components/LoginModal';
import CheckoutModal from './components/CheckoutModal';
import PaymentModal from './components/PaymentModal';
import SuccessModal from './components/SuccessModal';
import ServiceDrawer from './components/ServiceDrawer';
import HireWorkerPage from './pages/HireWorkerPage';
import ProfileModal from './components/ProfileModal';
import SupportModal from './components/SupportModal';
import WishlistModal from './components/WishlistModal';
import BookingsModal from './components/BookingsModal';
import Footer from './components/Footer';
import CraneButton from './components/CraneButton';
import FloatingTexture from './components/FloatingTexture';
import CartNotification from './components/CartNotification';
import EstimateConsultantWidget from './components/EstimateConsultantWidget';
import EstimateConsultantModal from './components/EstimateConsultantModal';
import EstimateConsultantChatModal from './components/EstimateConsultantChatModal';
import FolderSelectModal from './components/FolderSelectModal';
import MobileBottomNav from './components/MobileBottomNav';
import NotifyModal from './components/NotifyModal';
import WishlistAnimation from './components/WishlistAnimation';
import LeafletLocationModal from './components/LeafletLocationModal';
import { geocodeAddress, reverseGeocodeCoordinates } from './utils/distanceCalculator';

// Views for mobile-first navigation
import WishlistView from './components/views/WishlistView';
import BookingsView from './components/views/BookingsView';
import ProfileView from './components/views/ProfileView';
import PrivacyPolicyView from './components/views/PrivacyPolicyView';

export default function App() {
  const navigate = useNavigate();
  const { deliveryAddress, setLocationModalOpen } = useLocation();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [cartNotifItem, setCartNotifItem] = useState(null);
  const [consultantModalOpen, setConsultantModalOpen] = useState(false);
  const [consultantChatOpen, setConsultantChatOpen] = useState(false);
  const [folderSelectOpen, setFolderSelectOpen] = useState(false);
  const [selectedProductForFolder, setSelectedProductForFolder] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyProduct, setNotifyProduct] = useState(null);
  const [wishlistAnims, setWishlistAnims] = useState([]);

  const [activeVendors, setActiveVendors] = useState([]);
  const [liveProducts, setLiveProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // ── Load products & vendors from backend on mount ─────────
  useEffect(() => {
    fetchProducts()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLiveProducts(res.data);
          console.log('[APP] Products loaded:', res.data.length);
        } else {
          console.warn('[APP] fetchProducts returned unexpected shape:', res);
        }
      })
      .catch((e) => {
        console.error('[APP] fetchProducts failed — is client backend running on port 5002?', e.message);
      });

    fetchActiveVendors()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setActiveVendors(res.data);
        }
      })
      .catch((e) => console.warn('[API] fetchActiveVendors failed:', e.message));

    fetchGroupedProducts()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setGroupedProducts(res.data);
          console.log('[APP] Grouped Products loaded:', res.data.length);
        }
      })
      .catch((e) => console.warn('[API] fetchGroupedProducts failed:', e.message));
  }, []);

  // ── Load products for a specific vendor shop ──────────────
  const loadShopProducts = useCallback((vendor) => {
    setSelectedVendor(vendor);
    if (!vendor?.id) return;
    fetchVendorProducts(vendor.id)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLiveProducts(res.data);
        }
      })
      .catch((e) => console.warn('[API] fetchVendorProducts failed:', e.message));
  }, []);
  const { showToast } = useToast();
  const { addToCart: cartAddToCart, clearCart, cart } = useCart();
  const { authLoading, isLoggedIn, userData, toggleWishlist, addBooking, setBookings, logout } = useAuth();

  // ── Real-time polling for order status updates ──────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleOrdersAuthFailure = (error, source) => {
      console.warn(`[APP] ${source}:`, error.message);
      if (error?.status === 401 || /invalid token|no token provided|unauthorized/i.test(String(error?.message || ''))) {
        logout();
      }
    };

    // Initial fetch
    fetchMyOrders()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBookings(res.data);
        }
      })
      .catch((e) => {
        handleOrdersAuthFailure(e, 'fetchMyOrders failed');
      });

    // Set up polling interval to refresh orders every 5 seconds
    const pollInterval = setInterval(() => {
      fetchMyOrders()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setBookings(res.data);
          }
        })
        .catch((e) => {
          handleOrdersAuthFailure(e, 'fetchMyOrders polling failed');
        });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isLoggedIn, logout, setBookings]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hasExactLocation = Number.isFinite(deliveryAddress?.lat) && Number.isFinite(deliveryAddress?.lng);
    const alreadyPrompted = sessionStorage.getItem('dechta_location_prompted') === '1';
    const shouldAutoPrompt = sessionStorage.getItem('dechta_force_location_prompt') === '1';

    if (shouldAutoPrompt) {
      sessionStorage.removeItem('dechta_force_location_prompt');
    }

    if (!shouldAutoPrompt || hasExactLocation || alreadyPrompted) return;

    const promptTimer = setTimeout(() => {
      setLocationModalOpen(true);
      sessionStorage.setItem('dechta_location_prompted', '1');
    }, 1200);

    return () => clearTimeout(promptTimer);
  }, [deliveryAddress?.lat, deliveryAddress?.lng, setLocationModalOpen]);

  // Unused effect removed

  const openProduct = useCallback((product, source) => {
    setCurrentProduct({ 
      ...product, 
      source,
      vendorName: product.vendorName || (selectedVendor ? selectedVendor.shop_name : null)
    });
    setCurrentPage('product');
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate('/');
  }, [selectedVendor, navigate]);

  const openInteriors = useCallback(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setCurrentPage('interiors');
    setActiveCategory('services');
    navigate('/');
  }, [navigate]);

  const goHome = useCallback((targetCat = 'all') => {
    setCurrentPage('home');
    if (targetCat) setActiveCategory(targetCat);
    setCurrentProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/');
  }, [navigate]);

  const handleWishlistClick = useCallback((product, event) => {
    // Determine the animation start coordinates
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (event) {
      // Look for the closest valid target or use mouse position
      const targetElement = event.currentTarget || event.target;
      if (targetElement && typeof targetElement.getBoundingClientRect === 'function') {
        const rect = targetElement.getBoundingClientRect();
        startX = rect.left + (rect.width / 2);
        startY = rect.top + (rect.height / 2);
      } else {
        startX = event.clientX;
        startY = event.clientY;
      }
    }

    if (userData.wishlistFolders && userData.wishlistFolders.length > 0) {
      setSelectedProductForFolder(product);
      setFolderSelectOpen(true);
    } else {
      // Direct save to default wishlist
      const currentWishlist = Array.isArray(userData.wishlist) ? userData.wishlist : [];
      const isRemoving = currentWishlist.includes(product.id);
      toggleWishlist(product.id);

      if (isRemoving) {
        showToast('Removed from Wishlist');
      } else {
        showToast('Saved to Wishlist');
        // Only animate when ADDING to wishlist
        setWishlistAnims(prev => [...prev, {
          id: Date.now() + Math.random(),
          startX,
          startY
        }]);
      }
    }
  }, [userData.wishlistFolders, userData.wishlist, toggleWishlist, showToast]);

  const openDrawerForService = useCallback((key) => {
    setDrawerKey(key);
    setDrawerOpen(true);
  }, []);

  const navPages = ['wishlist', 'bookings', 'profile', 'privacy'];
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;
  const isNavPage = navPages.includes(currentPage);
  const hideGlobalUIOnMobile = isMobile() && isNavPage;

  const handleNotifyClick = useCallback((product) => {
    setNotifyProduct(product);
    setNotifyModalOpen(true);
  }, []);

  const handleMobileNav = useCallback((page, desktopModalSetter) => {
    if (isMobile()) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'auto' });
      navigate('/');
    } else {
      desktopModalSetter(true);
    }
  }, [navigate]);

  const handleAddToCart = useCallback((item) => {
    // Enrich cart item with full product data from liveProducts
    // This ensures vendor_id is always correctly populated for order routing
    const fullProduct = liveProducts.find(p => String(p.id) === String(item.id));
    const enriched = fullProduct ? {
      ...item,
      vendor_id:     fullProduct.vendor_id     || null,
      vendor_lat:    fullProduct.vendor_lat    || null,
      vendor_lng:    fullProduct.vendor_lng    || null,
      selling_price: fullProduct.selling_price  || item.price,
      price:         item.price || fullProduct.selling_price || fullProduct.price,
      images:        fullProduct.images         || [],
      category:      fullProduct.category       || '',
      shop_name:     fullProduct.shop_name      || null,
    } : item;

    cartAddToCart(enriched);
    setCartNotifItem(enriched);
  }, [cartAddToCart, liveProducts]);

  const handleBuyNow = useCallback((item) => {
    // Enrich like handleAddToCart
    const fullProduct = liveProducts.find(p => String(p.id) === String(item.id));
    const enriched = fullProduct ? {
      ...item,
      vendor_id:     fullProduct.vendor_id     || null,
      vendor_lat:    fullProduct.vendor_lat    || null,
      vendor_lng:    fullProduct.vendor_lng    || null,
      selling_price: fullProduct.selling_price  || item.price,
      price:         item.price || fullProduct.selling_price || fullProduct.price,
      images:        fullProduct.images         || [],
      category:      fullProduct.category       || '',
      shop_name:     fullProduct.shop_name      || null,
    } : item;

    // Only add if not already in cart
    if (!cart[item.id]?.qty) {
      cartAddToCart(enriched);
    }
    // Open checkout (or login)
    if (isLoggedIn) {
      setCheckoutOpen(true);
    } else {
      setLoginOpen(true);
    }
  }, [cartAddToCart, liveProducts, cart, isLoggedIn]);

  const handlePlaceOrder = useCallback(async (items, total, extraData) => {
    let bId = Math.floor(1000 + Math.random() * 9000);
    let estimatedEta = null;
    let orderSaved = false;

    // ── Save order to backend DB so vendor can see it ─────────
    try {
      const hasValidCoords = (lat, lng) => {
        const nLat = Number(lat);
        const nLng = Number(lng);
        return Number.isFinite(nLat) && Number.isFinite(nLng) && (Math.abs(nLat) > 0.001 || Math.abs(nLng) > 0.001);
      };

      const resolvedAddressDetails = {
        tag: extraData?.addressTag || 'other',
        area: extraData?.addressArea || '',
        city: extraData?.addressCity || '',
        state: extraData?.addressState || '',
        pincode: extraData?.addressPincode || '',
        landmark: extraData?.addressLandmark || '',
        lat: extraData?.addressLat ?? null,
        lng: extraData?.addressLng ?? null,
      };

      if (!hasValidCoords(resolvedAddressDetails.lat, resolvedAddressDetails.lng) && extraData?.address) {
        try {
          const geocoded = await geocodeAddress(extraData.address);
          resolvedAddressDetails.lat = Number(geocoded.lat);
          resolvedAddressDetails.lng = Number(geocoded.lng);

          if (!resolvedAddressDetails.area || !resolvedAddressDetails.city || !resolvedAddressDetails.state) {
            const reverse = await reverseGeocodeCoordinates(geocoded.lat, geocoded.lng);
            resolvedAddressDetails.area = resolvedAddressDetails.area || reverse.area || reverse.street || '';
            resolvedAddressDetails.city = resolvedAddressDetails.city || reverse.city || '';
            resolvedAddressDetails.state = resolvedAddressDetails.state || reverse.state || '';
            resolvedAddressDetails.pincode = resolvedAddressDetails.pincode || reverse.zip || '';
          }
        } catch (geoErr) {
          console.warn('[ORDER] Address geocode fallback failed:', geoErr.message);
        }
      }

      const orderPayload = {
        items: items.map(i => ({
          id:           i.id,
          name:         i.name,
          price:        i.price || i.selling_price,
          qty:          i.qty || 1,
          vendor_id:    i.vendor_id || null,
          shop_name:    i.shop_name || null,
          vendor_lat:   i.vendor_lat ?? extraData?.pickup_lat ?? null,
          vendor_lng:   i.vendor_lng ?? extraData?.pickup_lng ?? null,
          dest_lat:     resolvedAddressDetails.lat,
          dest_lng:     resolvedAddressDetails.lng,
          images:       i.images,
        })),
        total_amount:     total,
        customer_name:    userData.name  || '',
        customer_phone:   userData.phone || '',
        delivery_address: extraData?.address || '',
        delivery_address_details: {
          ...resolvedAddressDetails,
        },
        schedule:         extraData?.schedule || null,
        instructions:     extraData?.instructions || null,
        vehicle:          extraData?.vehicle || null,
        delivery_fee:     extraData?.delivery_fee || 0,
        delivery_distance_km: extraData?.delivery_distance_km ?? null,
        delivery_pricing: extraData?.delivery_pricing || null,
        gst:              extraData?.gst || null,
        tip:              extraData?.tip || 0,
      };
      const res = await placeOrder(orderPayload);
      if (res.success) {
        orderSaved = true;
        if (res.data?.bookingId) bId = res.data.bookingId;
        if (res.data?.estimated_eta) estimatedEta = res.data.estimated_eta;
        console.log('[ORDER] Saved to DB, bookingId:', bId, 'ETA:', estimatedEta);
      }
    } catch (e) {
      // Non-blocking — UI still completes even if API fails
      console.warn('[ORDER] API save failed (order still shown locally):', e.message);
    }

    setBookingId(bId);

    // ── Update local state for immediate UI feedback ──────────
    const localBooking = {
      id: bId,
      date: extraData?.schedule?.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: extraData?.schedule?.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      items,
      total,
      status: 'Confirmed',
      tip: extraData?.tip || 0,
      instructions: extraData?.instructions || null,
      isScheduled: !!extraData?.schedule,
      gst: extraData?.gst || null,
      estimated_eta: estimatedEta
    };

    if (orderSaved) {
      try {
        const ordersRes = await fetchMyOrders();
        if (ordersRes.success && Array.isArray(ordersRes.data)) {
          setBookings(ordersRes.data);
        } else {
          addBooking(localBooking);
        }
      } catch (_error) {
        addBooking(localBooking);
      }
    } else {
      addBooking(localBooking);
    }

    clearCart();
    setOrderData(null);
    setPaymentOpen(false);
    setCheckoutOpen(false);
    setSuccessOpen(true);
  }, [addBooking, clearCart, setBookings, userData]);

  const setCategory = useCallback((cat) => {
    setActiveCategory(cat);

    if (cat === 'services') {
      setActiveCategory('services');
      openInteriors();
      return;
    }

    if (cat === 'hire') {
      setActiveCategory('hire');
      setCurrentPage('hire');
      window.scrollTo({ top: 0, behavior: 'auto' });
      navigate('/');
      return;
    }

    const scrollToHardware = () => {
      // Find the parent section to ensure we see the title
      const sliderEl = document.getElementById('hardware-slider');
      if (sliderEl && sliderEl.parentElement) {
        // Adjust -140px to account for the fixed Navbar and CategoryBar
        const yOffset = -140;
        const y = sliderEl.parentElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    if (currentPage !== 'home') {
      goHome(cat);
      // Wait for home page to render before scrolling
      setTimeout(() => {
        if (cat === 'hardware') {
          scrollToHardware();
        } else if (cat === 'hire') {
          setCurrentPage('hire');
        } else if (cat === 'all') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      if (cat === 'hardware') {
        scrollToHardware();
      } else if (cat === 'hire') {
        setCurrentPage('hire');
      } else if (cat === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentPage, goHome, openInteriors, navigate]);

  // Wait for both: app loading animation AND auth session check
  if (loading || authLoading) return <LoadingScreen />;

  return (
    <div className="overflow-x-hidden relative bg-white text-qc-black dark:bg-[#020617] dark:text-white transition-colors duration-300 min-h-screen selection:bg-cyan-500 selection:text-white font-sans pb-20 lg:pb-0">
      <FloatingTexture />
      {currentPage === 'home' && (
        <>
          <div className="hidden md:block absolute top-0 left-0 w-full h-[450px] overflow-hidden pointer-events-none z-10">
            <img src="https://pngimg.com/d/wrench_PNG1117.png" className="absolute -left-20 top-[32%] w-64 md:w-80 h-auto object-contain scale-x-[-1] rotate-[15deg] drop-shadow-2xl opacity-90" alt="Spanner" />
            <img src="https://pngimg.com/d/hammer_PNG3886.png" className="absolute -right-16 top-[35%] w-64 md:w-80 h-auto object-contain -rotate-[35deg] drop-shadow-2xl opacity-90" alt="Hammer" />
          </div>
          <div className="absolute top-0 left-0 w-full h-[860px] md:h-[780px] bg-cyan-400 z-0" />
        </>
      )}

      {currentPage !== 'privacy' && !hideGlobalUIOnMobile && (
        <>
          <Navbar
            allProducts={[...hardware, ...services, ...(liveProducts || [])]}
            onOpenProduct={openProduct}
            onCartClick={() => setCartOpen(!cartOpen)}
            onLoginClick={() => setLoginOpen(true)}
            onProfileClick={() => setProfileOpen(true)}
            onWishlistClick={() => setWishlistOpen(true)}
            onBookingsClick={() => setBookingsOpen(true)}
            onSupportClick={() => setSupportOpen(true)}
            onLogoClick={goHome}
          />
          <CategoryBar activeCategory={activeCategory} setCategory={setCategory} />
        </>
      )}

      <Routes>
        <Route path="/category/:categoryId" element={
          <CategoryPage
            onOpenProduct={openProduct}
            onAddToCart={handleAddToCart}
            onWishlistClick={handleWishlistClick}
            onNotifyClick={handleNotifyClick}
          />
        } />
        <Route path="*" element={
          <>
            {currentPage === 'home' && (
              <CraneButton onClick={() => { setCurrentPage('hire'); navigate('/'); }} />
            )}

            {currentPage === 'home' && (
              <HomePage
                hardware={hardware}
                services={services}
                liveProducts={liveProducts}
                groupedProducts={groupedProducts}
                activeVendors={activeVendors}
                selectedVendor={selectedVendor}
                onSelectVendor={loadShopProducts}
                onOpenProduct={openProduct}
                onAddToCart={handleAddToCart}
                onWishlistClick={handleWishlistClick}
                onNotifyClick={handleNotifyClick}
                onOpenDrawer={openDrawerForService}
                onOpenHireMap={() => { setCurrentPage('hire'); navigate('/'); }}
                onOpenInteriors={openInteriors}
              />
            )}

            {currentPage === 'hire' && (
              <HireWorkerPage onBack={() => goHome('all')} />
            )}

            {currentPage === 'product' && currentProduct && (
              <ProductPage
                product={currentProduct}
                onBack={goHome}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onWishlistClick={handleWishlistClick}
                onNotifyClick={handleNotifyClick}
                allProducts={liveProducts}
                onOpenProduct={openProduct}
              />
            )}

            {currentPage === 'interiors' && (
              <InteriorsPage onBack={() => goHome('all')} onOpenConsultant={() => setConsultantModalOpen(true)} />
            )}

            {currentPage === 'wishlist' && (
              <WishlistView liveProducts={liveProducts} openProduct={openProduct} isPage={true} onBack={goHome} />
            )}

            {currentPage === 'bookings' && (
              <BookingsView isPage={true} onBack={goHome} />
            )}

            {currentPage === 'profile' && (
              <ProfileView isPage={true} onBack={goHome} />
            )}

            {currentPage === 'privacy' && (
              <PrivacyPolicyView onBack={goHome} />
            )}
          </>
        } />
      </Routes>

      {currentPage !== 'privacy' && !hideGlobalUIOnMobile && (
        <Footer 
          onOpenDrawer={openDrawerForService} 
          onOpenHireMap={() => setCurrentPage('hire')} 
          onPrivacyClick={() => setCurrentPage('privacy')}
        />
      )}

      {/* Overlays */}
      <CartNotification
        item={cartNotifItem}
        onClose={() => setCartNotifItem(null)}
        onViewCart={() => setCartOpen(true)}
        onBuyNow={handleBuyNow}
      />
      <CartDrawer 
        open={cartOpen} 
        onClose={() => setCartOpen(false)} 
        onProductClick={(item) => {
          // Find the full product object from our data
          let fullProduct = hardware.find(p => p.id == item.id);
          if (!fullProduct) fullProduct = services.find(p => p.id == item.id);
          if (!fullProduct) {
            Object.values(serviceData).forEach(cat => {
              const found = cat.items.find(p => p.id == item.id);
              if (found) fullProduct = found;
            });
          }
          if (!fullProduct && liveProducts) {
            fullProduct = liveProducts.find(p => p.id == item.id);
          }

          if (fullProduct) {
            openProduct(fullProduct);
            setCartOpen(false);
          }
        }}
        onCheckout={() => {
          setCartOpen(false);
          if (isLoggedIn) {
            setCheckoutOpen(true);
          } else {
            setLoginOpen(true);
          }
        }} 
      />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onPay={(data) => { setOrderData(data); setPaymentOpen(true); }} />
      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} onSuccess={handlePlaceOrder} orderData={orderData} />
      <SuccessModal open={successOpen} bookingId={bookingId} onClose={() => setSuccessOpen(false)} />
      <ServiceDrawer open={drawerOpen} serviceKey={drawerKey} onClose={() => setDrawerOpen(false)} onViewCart={() => { setDrawerOpen(false); setCartOpen(true); }} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      <WishlistModal open={wishlistOpen} onClose={() => setWishlistOpen(false)} liveProducts={liveProducts} openProduct={openProduct} />
      <BookingsModal open={bookingsOpen} onClose={() => setBookingsOpen(false)} />
      <LeafletLocationModal />
      <FolderSelectModal open={folderSelectOpen} onClose={() => setFolderSelectOpen(false)} product={selectedProductForFolder} />
      {currentPage !== 'privacy' && currentPage !== 'hire' && (
        <>
          <EstimateConsultantWidget onOpenModal={() => setConsultantModalOpen(true)} />
          <EstimateConsultantModal open={consultantModalOpen} onClose={() => setConsultantModalOpen(false)} onOpenChat={() => { setConsultantModalOpen(false); setConsultantChatOpen(true); }} />
          <EstimateConsultantChatModal open={consultantChatOpen} onClose={() => setConsultantChatOpen(false)} />
        </>
      )}
      <NotifyModal open={notifyModalOpen} onClose={() => setNotifyModalOpen(false)} product={notifyProduct} />

      {/* Render Wishlist Animations */}
      {wishlistAnims.map(anim => (
        <WishlistAnimation
          key={anim.id}
          id={anim.id}
          startX={anim.startX}
          startY={anim.startY}
          onComplete={(idToRemove) => {
            setWishlistAnims(prev => prev.filter(a => a.id !== idToRemove));
          }}
        />
      ))}

      {currentPage !== 'privacy' && (
        <MobileBottomNav
          currentPage={currentPage}
          onHomeClick={goHome}
          onWishlistClick={() => handleMobileNav('wishlist', setWishlistOpen)}
          onBookingsClick={() => handleMobileNav('bookings', setBookingsOpen)}
          onProfileClick={() => handleMobileNav('profile', setProfileOpen)}
          onLoginClick={() => setLoginOpen(true)}
        />
      )}
    </div>
  );
}
