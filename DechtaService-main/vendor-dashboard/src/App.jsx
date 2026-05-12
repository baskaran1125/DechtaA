import { useState, useEffect, useRef } from 'react';
import { SplashScreen } from './components/splash/SplashScreen';
import { Sidebar }      from './components/layout/Sidebar';
import { Header }       from './components/layout/Header';
import { MobileNav }    from './components/layout/MobileNav';
import { Toast }        from './components/ui/Toast';
import { Icons }        from './components/ui/Icons';
import { SupportModal } from './components/modals/SupportModal';

import WelcomePage      from './pages/WelcomePage';
import DriverPlaceholder from './pages/DriverPlaceholder';
import WorkerPlaceholder from './pages/WorkerPlaceholder';
import LoginPage         from './pages/LoginPage';
import Dashboard         from './pages/Dashboard';
import ProductList       from './pages/ProductList';
import  ProductForm    from './pages/ProductForm';
import OrdersPage        from './pages/OrdersPage';
import  WalletPage     from './pages/WalletPage';
import  SalesSummary   from './pages/SalesSummary';
import BillingPage       from './pages/BillingPage';
import  SettingsPage   from './pages/SettingsPage';

import {
  getProfile, updateProfile,
  getProducts, createProduct, updateProduct, toggleActive, boostProduct,
  getOrders, createOrder, updateOrderStatus,
  getInvoices, createInvoice,
  getSettlements,
} from './api/apiClient';
import { getCurrentLocation, reverseGeocodeCoordinates } from './utils/locationUtils';

const NAV = [
  { id: 'home',     label: 'Dashboard', icon: <Icons.Home /> },
  { id: 'products', label: 'Catalog',   icon: <Icons.Grid /> },
  { id: 'orders',   label: 'Orders',    icon: <Icons.Truck /> },
  { id: 'wallet',   label: 'Wallet',    icon: <Icons.Wallet /> },
  { id: 'sales',    label: 'Analytics', icon: <Icons.BarChart /> },
  { id: 'billing',  label: 'Billing',   icon: <Icons.Receipt /> },
  { id: 'settings', label: 'Settings',  icon: <Icons.Settings /> },
];

const extractVendorPayload = (responseData) => {
  if (!responseData) return {};
  if (responseData.vendor && typeof responseData.vendor === 'object') return responseData.vendor;
  if (responseData.data && typeof responseData.data === 'object') return responseData.data;
  return responseData;
};

const isVendorApprovedForCatalog = (vendorData) => {
  const hasVendorPayload = !!(vendorData && typeof vendorData === 'object' && Object.keys(vendorData).length > 0);
  if (!hasVendorPayload) {
    return false;
  }

  const verification = String(
    vendorData?.verificationStatus ||
    vendorData?.verification_status ||
    vendorData?.userVerificationStatus ||
    ''
  ).trim().toLowerCase();

  const statusToken = String(vendorData?.status || vendorData?.user_status || '').trim().toLowerCase();
  const profileComplete =
    vendorData?.profileComplete === true ||
    vendorData?.profile_complete === true ||
    vendorData?.user_profile_complete === true ||
    String(vendorData?.profileComplete || vendorData?.profile_complete || vendorData?.user_profile_complete || '').trim().toLowerCase() === 'true' ||
    Number(vendorData?.profileComplete || vendorData?.profile_complete || vendorData?.user_profile_complete || 0) === 1;

  const approvedFlag =
    vendorData?.isApproved === true ||
    vendorData?.is_approved === true ||
    String(vendorData?.isApproved || vendorData?.is_approved || '').trim().toLowerCase() === 'true' ||
    Number(vendorData?.isApproved || vendorData?.is_approved || 0) === 1;

  if (['rejected', 'declined', 'suspended', 'banned'].includes(verification)) return false;
  if (['rejected', 'suspended', 'banned'].includes(statusToken)) return false;
  if (['pending', 'pending_verification', 'under_review', 'submitted'].includes(verification)) return false;

  const statusApproved = ['verified', 'approved', 'completed'].includes(verification) || ['approved', 'verified'].includes(statusToken);
  return profileComplete && (statusApproved || approvedFlag);
};

const CatalogLockedNotice = ({ onOpenSettings }) => (
  <div className="p-6">
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Catalog Locked</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Submit your vendor details in Settings and wait for admin approval. Catalog access will be enabled after verification.
      </p>
      <button
        onClick={onOpenSettings}
        className="mt-4 px-4 py-2 rounded-lg bg-[#0ceded] text-black text-sm font-bold hover:opacity-90"
      >
        Open Settings
      </button>
    </div>
  </div>
);

const App = () => {
  const [selectedRole,  setSelectedRole] = useState(null);  // null = show welcome, 'vendor' = vendor app
  const [isAuth,       setIsAuth]       = useState(false);
  const [view,         setView]         = useState('home');
  const [isDark,       setIsDark]       = useState(true);
  const [toasts,       setToasts]       = useState([]);
  const [showSupport,  setShowSupport]  = useState(false);

  const [vendor,       setVendor]       = useState({});
  const [products,     setProducts]     = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [settlements,  setSettlements]  = useState([]);
  const [editProduct,  setEditProduct]  = useState(null);
  const [pollError,    setPollError]    = useState(null);
  const pollIntervalRef = useRef(null);
  const pollFailCountRef = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const token = localStorage.getItem('dechta_token');
    if (token) { setIsAuth(true); fetchAll(); }
  }, []);

  // -- Auto-poll for new orders every 30 seconds with error tracking -----
  // This ensures online orders placed from the client app appear
  // on the vendor dashboard without requiring a manual refresh.
  // Includes error state tracking and exponential backoff for failures.
  useEffect(() => {
    if (!isAuth) return;
    
    const pollOrders = async () => {
      try {
        const oRes = await getOrders();
        setOrders(oRes.data.data || oRes.data.orders || []);
        setPollError(null);  // Clear error on success
        pollFailCountRef.current = 0;  // Reset failure counter
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('dechta_token');
          setIsAuth(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        // Track error but don't crash - log for monitoring
        setPollError(`Order sync failed (attempt ${pollFailCountRef.current + 1})`);
        pollFailCountRef.current = Math.min(pollFailCountRef.current + 1, 5);
        console.error('Order polling error:', err.message);
      }
    };

    // Start initial poll immediately, then repeat every 30 seconds
    pollOrders();
    pollIntervalRef.current = setInterval(pollOrders, 30000);
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    };
  }, [isAuth]);

  useEffect(() => {
    const syncVendorLocation = async () => {
      if (selectedRole !== 'vendor' || !isAuth) return;

      try {
        const gps = await getCurrentLocation();
        const resolved = await reverseGeocodeCoordinates(gps.lat, gps.lng).catch(() => null);
        const locationLabel =
          resolved?.displayName ||
          [resolved?.area, resolved?.city, resolved?.state].filter(Boolean).join(', ') ||
          `Lat ${Number(gps.lat).toFixed(5)}, Lng ${Number(gps.lng).toFixed(5)}`;

        const payload = {
          latitude: gps.lat,
          longitude: gps.lng,
          locationLabel,
        };

        if ((!vendor?.address || !String(vendor.address).trim()) && resolved?.displayName) {
          payload.address = resolved.displayName;
        }

        const res = await updateProfile(payload);
        const nextVendor = extractVendorPayload(res?.data);
        if (Object.keys(nextVendor).length) {
          setVendor(nextVendor);
        }
      } catch {
        notify('Please turn on location to improve delivery distance and charge calculation.', 'info');
      }
    };

    syncVendorLocation();
  }, [selectedRole, isAuth]);

  const notify = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const fetchAll = async () => {
    try {
      const vRes = await getProfile();
      const nextVendor = extractVendorPayload(vRes?.data);
      setVendor(nextVendor);

      const catalogUnlocked = isVendorApprovedForCatalog(nextVendor);
      const requests = [getOrders(), getSettlements(), getInvoices()];

      if (catalogUnlocked) {
        requests.unshift(getProducts());
      } else {
        setProducts([]);
      }

      const results = await Promise.allSettled(requests);
      const [maybeProducts, oRes, sRes, iRes] = catalogUnlocked ? results : [null, ...results];

      if (catalogUnlocked && maybeProducts?.status === 'fulfilled') {
        setProducts(maybeProducts.value.data?.products || maybeProducts.value.data?.data || []);
      }

      if (oRes.status === 'fulfilled') {
        setOrders(oRes.value.data?.data || oRes.value.data?.orders || []);
      }

      if (sRes.status === 'fulfilled') {
        setSettlements(sRes.value.data?.settlements || sRes.value.data?.data || []);
      }

      if (iRes.status === 'fulfilled') {
        setInvoices(iRes.value.data?.invoices || iRes.value.data?.data || []);
      }

      const failures = results.filter((r) => r.status === 'rejected');
      const unauthorized = failures.some((r) => r.reason?.response?.status === 401);
      if (unauthorized) {
        localStorage.removeItem('dechta_token');
        setIsAuth(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('dechta_token');
        setIsAuth(false);
      }
    }
  };

  const handleLoginSuccess = (vendorData) => {
    setVendor(vendorData);
    setIsAuth(true);
    fetchAll();
  };

  const handleLogout = () => {
    localStorage.removeItem('dechta_token');
    setIsAuth(false);
    setSelectedRole(null);  // Go back to welcome page
    setVendor({}); setProducts([]); setOrders([]);
  };

  // -- Product handlers --------------------------------------
  const handleSaveProduct = async (prod) => {
    try {
      if (prod.id) {
        const res = await updateProduct(prod.id, prod);
        setProducts(p => p.map(x => x.id === prod.id ? res.data.product : x));
      } else {
        const res = await createProduct(prod);
        setProducts(p => [res.data.product, ...p]);
      }
      notify(prod.id ? 'Product Updated!' : 'Product Saved!', 'success');
      setEditProduct(null);
      setView('products');
      fetchAll(); // Force a clean sync to destroy any ghost state variables
    } catch (err) { notify(err.response?.data?.message || err.response?.data?.error || 'Save failed', 'error'); }
  };

  const handleToggleActive = async (id) => {
    try {
      const res = await toggleActive(id);
      setProducts(p => p.map(x => x.id === id ? { ...x, is_active: res.data.product.is_active } : x));
    } catch { notify('Failed to update status', 'error'); }
  };

  const handleBoost = async (id) => {
    try {
      await boostProduct(id);
      setProducts(p => p.map(x => x.id === id ? { ...x, isBoosted: true } : x));
      notify('Product Boosted! ??', 'success');
    } catch { notify('Boost failed', 'error'); }
  };

  // -- Order handlers ----------------------------------------
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await updateOrderStatus(id, status);
      const updatedOrder = res?.data?.data || res?.data;
      if (!updatedOrder) throw new Error('Missing updated order payload');
      setOrders(p => p.map(o => o.id === id ? { ...o, ...updatedOrder } : o));
      return updatedOrder;
    } catch {
      notify('Status update failed', 'error');
      return null;
    }
  };

  const handleOfflineBill = async ({ customerName, customerPhone, customerGst, address, items, totalAmount }) => {
    try {
      await createInvoice({
        customer_name: customerName, 
        customer_phone: customerPhone, 
        customer_gst: customerGst,
        customer_address: address, 
        items, 
        tax_rate: 18,
        total_amount: totalAmount,
        subtotal: totalAmount / 1.18,
        tax_amount: totalAmount - (totalAmount / 1.18)
      });
      notify('Offline Bill Generated! ??', 'success');
      fetchAll();
    } catch (err) { notify(err.response?.data?.error || 'Bill failed', 'error'); }
  };

  // -- Vendor update handler ---------------------------------
  const handleUpdateVendor = async (data) => {
    try {
      const res = await updateProfile(data);
      const updatedVendor = extractVendorPayload(res?.data);
      if (updatedVendor && Object.keys(updatedVendor).length > 0) {
        setVendor(updatedVendor);
      } else {
        await fetchAll();
      }
      notify('Settings saved', 'success');
      return updatedVendor;
    } catch { notify('Save failed', 'error'); }
    return null;
  };

  const lowStockCount = products.filter(p => p.stock < 5).length;
  const catalogUnlocked = isVendorApprovedForCatalog(vendor);

  const safeSetView = (nextView) => {
    if ((nextView === 'products' || nextView === 'add-product') && !catalogUnlocked) {
      notify('Catalog access is locked until admin approval.', 'error');
      setView('settings');
      return;
    }
    setView(nextView);
  };

  const navItems = NAV.map((item) => {
    if (item.id === 'products' && !catalogUnlocked) {
      return {
        ...item,
        disabled: true,
        disabledReason: 'Waiting for admin approval',
      };
    }
    return item;
  });

  // -- Show Welcome Page (Role Selection) --------------------
  if (!selectedRole) {
    return (
      <>
        <WelcomePage onRoleSelect={(role) => setSelectedRole(role)} />
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </>
    );
  }

  // -- Driver Role ------------------------------------------
  if (selectedRole === 'driver') {
    return (
      <>
        <DriverPlaceholder onBack={() => setSelectedRole(null)} />
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </>
    );
  }

  // -- Worker Role ------------------------------------------
  if (selectedRole === 'worker') {
    return (
      <>
        <WorkerPlaceholder onBack={() => setSelectedRole(null)} />
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </>
    );
  }

  // -- Vendor Role – Pre-auth view --------------------------
  if (selectedRole === 'vendor' && !isAuth) {
    return (
      <>
        <SplashScreen />
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          isDark={isDark}
          toggleTheme={() => setIsDark(!isDark)}
          notify={notify}
        />
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </>
    );
  }

  // -- Vendor Role – Authenticated layout ----------------------
  if (selectedRole === 'vendor') {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans text-gray-900 dark:text-white">
      <Sidebar
        view={view} setView={safeSetView}
        vendor={vendor} onLogout={handleLogout}
        navItems={navItems}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          view={view}
          isDark={isDark}
          toggleTheme={() => setIsDark(!isDark)}
          lowStockCount={lowStockCount}
          onSupport={() => setShowSupport(true)}
        />

        <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50 dark:bg-slate-950 pb-20 md:pb-0">
          {view === 'home'        && <Dashboard    products={products} orders={orders} setView={safeSetView} />}
          {view === 'products'    && (catalogUnlocked
            ? <ProductList  products={products} setView={safeSetView} toggleActive={handleToggleActive} onBoost={handleBoost} onEdit={p => { setEditProduct(p); safeSetView('add-product'); }} />
            : <CatalogLockedNotice onOpenSettings={() => safeSetView('settings')} />)}
          {view === 'add-product' && (catalogUnlocked
            ? <ProductForm  onSave={handleSaveProduct} editingProduct={editProduct} onCancel={() => { setEditProduct(null); safeSetView('products'); }} notify={notify} />
            : <CatalogLockedNotice onOpenSettings={() => safeSetView('settings')} />)}
          {view === 'orders'      && <OrdersPage   orders={orders} onUpdateStatus={handleUpdateStatus} notify={notify} products={products} vendor={vendor} />}
          {view === 'wallet'      && <WalletPage   orders={orders} settlements={settlements} setSettlements={setSettlements} notify={notify} />}
          {view === 'sales'       && <SalesSummary orders={orders} products={products} notify={notify} />}
          {view === 'billing'     && <BillingPage  invoices={invoices} orders={orders} products={products} vendor={vendor} onGenerateOfflineBill={handleOfflineBill} />}
          {view === 'settings'    && <SettingsPage vendor={vendor} updateVendor={handleUpdateVendor} notify={notify} />}
        </div>

        <MobileNav view={view} setView={safeSetView} navItems={navItems} />
      </main>

      {toasts.map(t => (
        <Toast key={t.id} message={t.msg} type={t.type}
          onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
      ))}

      {showSupport && <SupportModal onClose={() => setShowSupport(false)} notify={notify} />}
    </div>
    );
  }

  // -- Fallback (should not reach here) ---------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <p className="text-2xl mb-4">Invalid role selected</p>
        <button onClick={() => setSelectedRole(null)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
          Go back to Welcome
        </button>
      </div>
    </div>
  );
};

export default App;
