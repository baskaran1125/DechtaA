import { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Icons } from '../components/ui/Icons';
import api from '../api/apiClient';

// ── period config ────────────────────────────────────────────
const PERIODS = [
  { key: 'today',    label: 'Today' },
  { key: '1week',    label: '1 Week' },
  { key: '1month',   label: '1 Month' },
  { key: '3months',  label: '3 Months' },
  { key: '6months',  label: '6 Months' },
  { key: '1year',    label: '1 Year' },
];

const PERIOD_LABELS = {
  today:    'Today',
  '1week':  'Last 7 Days',
  '1month': 'Last Month',
  '3months':'Last 3 Months',
  '6months':'Last 6 Months',
  '1year':  'Last 1 Year',
};

const normalizeOrderStatus = (order) => {
  const vendorStatus = String(order?.v_status || '').trim().toLowerCase();
  if (vendorStatus === 'accept') return 'assigned';

  const raw = String(order?.normalized_status || order?.normalizedStatus || order?.status || '').trim().toLowerCase();
  if (!raw) return 'pending';
  if (['pending', 'placed'].includes(raw)) return 'pending';
  if (['confirmed', 'processing', 'packed'].includes(raw)) return 'confirmed';
  if (['assigned', 'accepted'].includes(raw)) return 'assigned';
  if (['picked_up', 'arrived_pickup', 'out for delivery', 'arrived_dropoff', 'shipped', 'dispatched', 'in_transit', 'live'].includes(raw)) return 'in_transit';
  if (['delivered', 'completed', 'done'].includes(raw)) return 'delivered';
  if (['cancelled', 'canceled', 'missed', 'returned'].includes(raw)) return 'cancelled';
  return raw;
};

const toUiStatus = (normalizedStatus) => {
  if (normalizedStatus === 'delivered') return 'Completed';
  if (['in_transit', 'assigned', 'confirmed'].includes(normalizedStatus)) return 'Live';
  if (normalizedStatus === 'cancelled') return 'Cancelled';
  return 'Pending';
};

// ── get product name from order ─────────────────────────────────
const getProductName = (order) => {
  return order.productName || order.product_name || order.name || 'Order Item' || '—';
};

// ── get order amount ────────────────────────────────────────────
const getOrderAmount = (order) => {
  const amount = order.totalAmount || order.total_amount || order.final_amount || order.price || 0;
  return Number(amount);
};

// ── status badge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Completed: 'bg-green-500/20 text-green-400',
    Live:      'bg-blue-500/20  text-blue-400',
    Pending:   'bg-yellow-500/20 text-yellow-400',
    Cancelled: 'bg-red-500/20   text-red-400',
  };
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${map[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
};

// ── skeleton loader ──────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-700/40 rounded-lg ${className}`} />
);

// ─────────────────────────────────────────────────────────────
// Dashboard Component
// ─────────────────────────────────────────────────────────────
const Dashboard = ({ products, orders, setView }) => {
  const [period,  setPeriod]  = useState('1year');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats from backend whenever period changes
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/vendors/dashboard', { params: { period } });
        const data = res?.data || null;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [period]);

  // Pending count always from live orders prop (real-time)
  const pendingCount = orders.filter(o => normalizeOrderStatus(o) === 'pending').length;

  // Best performer display
  const bestProductName = stats?.bestProduct?.product_name || null;
  const bestOrderCount  = stats?.bestProduct?.order_count  || 0;

  // Recent orders: prefer live prop slice (already sorted by App.jsx), else from stats
  const recentOrders = useMemo(() => {
    if (orders.length) {
      return [...orders]
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
        .slice(0, 5);
    }
    return stats?.recentOrders || [];
  }, [orders, stats]);

  const periodLabel = PERIOD_LABELS[period];

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in">

      {/* ── Period Filter Tabs ─────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition
              ${period === p.key
                ? 'bg-[#0ceded] text-black shadow-md'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Pending Orders (always live) */}
        <div
          onClick={() => setView('orders')}
          className="bg-[#0ceded] p-5 rounded-2xl shadow-glow transform hover:-translate-y-1 transition cursor-pointer relative overflow-hidden col-span-1"
        >
          <div className="text-black/60 text-[10px] font-bold uppercase tracking-wider">
            Action Required
          </div>
          <div className="text-4xl font-black text-black mt-1">{pendingCount}</div>
          <div className="mt-3 text-xs font-bold text-black flex items-center gap-1">
            Pending Orders <span>→</span>
          </div>
        </div>

        {/* Total Inventory */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl soft-hover">
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            Total Inventory
          </div>
          {loading
            ? <Skeleton className="h-9 w-16 mt-2" />
            : <div className="text-3xl font-bold text-white mt-1">
                {stats?.totalInventory ?? products.length}
              </div>
          }
          <div className="text-xs text-green-400 mt-2">items listed</div>
        </div>

        {/* Period Orders */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl soft-hover">
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            {periodLabel} Orders
          </div>
          {loading
            ? <Skeleton className="h-9 w-12 mt-2" />
            : <div className="text-3xl font-bold text-white mt-1">
                {stats?.periodOrders ?? 0}
              </div>
          }
          <div className="text-xs text-gray-500 mt-2">{periodLabel}</div>
        </div>

        {/* Period Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl soft-hover">
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            {periodLabel} Revenue
          </div>
          {loading
            ? <Skeleton className="h-9 w-24 mt-2" />
            : <div className="text-3xl font-bold text-green-400 mt-1">
                ₹ {(stats?.periodRevenue ?? 0).toLocaleString('en-IN')}
              </div>
          }
          <div className="text-xs text-gray-500 mt-2">{periodLabel}</div>
        </div>
      </div>

      {/* ── Quick Actions + Best Performer ────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-full">
            <h3 className="font-bold text-white mb-5 text-sm uppercase tracking-wide">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Add Item',  icon: <Icons.Box />,      cls: 'text-[#0ceded]', view: 'add-product' },
                { label: 'Orders',   icon: <Icons.Truck />,    cls: 'text-blue-400',  view: 'orders'      },
                { label: 'Wallet',   icon: <Icons.Wallet />,   cls: 'text-green-400', view: 'wallet'      },
                { label: 'Analytics',icon: <Icons.BarChart />, cls: 'text-purple-400',view: 'sales'       },
              ].map(q => (
                <button
                  key={q.view}
                  onClick={() => setView(q.view)}
                  className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-xl border border-transparent hover:border-[#0ceded] transition text-gray-300 hover:text-white"
                >
                  <span className={`${q.cls} mb-2 text-2xl`}>{q.icon}</span>
                  <span className="text-xs font-bold">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Best Performer */}
        <div className="bg-gradient-to-br from-slate-800 to-black border border-slate-700 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#0ceded]/10 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] text-[#0ceded] uppercase font-bold mb-3">
              <span className="animate-pulse"><Icons.Award /></span>
              Best Performer · {PERIODS.find(p => p.key === period)?.label}
            </div>
            {loading ? (
              <>
                <Skeleton className="h-7 w-40 mb-2" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : bestProductName ? (
              <>
                <div className="text-xl font-bold text-white mb-1 leading-tight">
                  {bestProductName}
                </div>
                <div className="text-sm text-gray-400">
                  {bestOrderCount} order{bestOrderCount !== 1 ? 's' : ''} in period
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-white mb-1">No orders yet</div>
                <div className="text-sm text-gray-500">No data for this period</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Orders Table ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">
            Orders · {PERIODS.find(p => p.key === period)?.label}
          </h3>
          <span className="text-xs bg-slate-800 text-gray-400 px-3 py-1 rounded-full">
            {loading ? '…' : `${stats?.periodOrders ?? 0} shown`}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800 text-gray-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/60 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      #{String(o.id).slice(-8)}
                    </td>
                    <td className="px-5 py-3 text-white">
                      {getProductName(o)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-white">
                      ₹ {getOrderAmount(o).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={toUiStatus(normalizeOrderStatus(o))} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
