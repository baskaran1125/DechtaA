import { useState, useEffect, useRef } from 'react';
import api, { createSettlement, getSettlementStatus } from '../api/apiClient';
import { AddMoneyModal } from '../components/modals/AddMoneyModal';
import { WithdrawMoneyModal } from '../components/modals/WithdrawMoneyModal';

// ── period config (same as Dashboard) ───────────────────────
const PERIODS = [
  { key: 'all',      label: 'All' },
  { key: 'today',    label: 'Today' },
  { key: '1week',    label: '1 Week' },
  { key: '1month',   label: '1 Month' },
  { key: '3months',  label: '3 Months' },
  { key: '6months',  label: '6 Months' },
  { key: '1year',    label: '1 Year' },
];

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-700/40 rounded-lg ${className}`} />
);

// ─────────────────────────────────────────────────────────────
// WalletPage Component
// ─────────────────────────────────────────────────────────────
const WalletPage = ({ settlements, setSettlements, notify }) => {
  const [period,  setPeriod]  = useState('all');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const settlementAbortRef = useRef(null);

  // Default notify if not provided
  const defaultNotify = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
  };

  const showNotification = notify || defaultNotify;

  // Cleanup settlement on unmount
  useEffect(() => {
    return () => {
      if (settlementAbortRef.current) {
        settlementAbortRef.current.abort();
      }
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendors/wallet-stats', { params: { period } });
      const data = res?.data || null;
      if (data.success || data.totalRevenue !== undefined) {
        setStats(data);
        if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance);
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch wallet stats from backend whenever period changes
  useEffect(() => {
    fetchStats();
  }, [period]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForSettlementConfirmation = async (settlementId) => {
    const maxAttempts = 40; // ~2 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusRes = await getSettlementStatus(settlementId);
        const payload = statusRes?.data || {};
        const status = String(payload.status || payload.settlement?.status || '').toLowerCase();
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          return { status, settlement: payload.settlement };
        }
      } catch (err) {
        console.error(`Settlement status check attempt ${attempt + 1} failed:`, err.message);
        // Continue polling on error
      }
      await sleep(3000);
    }
    return { status: 'pending', settlement: null };
  };

  const handleSettle = async () => {
    const due = stats?.due ?? 0;
    if (due <= 0) return;
    
    // Prevent concurrent settlement requests
    if (settling) {
      showNotification('Settlement already in progress...', 'warning');
      return;
    }
    
    if (!confirm(`Confirm payment of INR ${due.toFixed(2)}?`)) return;

    setSettling(true);
    settlementAbortRef.current = { abort: () => { /* placeholder */ } };
    
    try {
      const res = await createSettlement(due);
      const payload = res?.data || {};
      const settlement = payload.settlement;
      const paymentLink = payload.payment_link;

      if (!payload.success || !settlement?.id || !paymentLink) {
        throw new Error(payload.message || 'Could not start settlement payment');
      }

      const popup = window.open(paymentLink, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = paymentLink;
        return;
      }

      showNotification('Complete payment in Cashfree. Checking status...', 'warning');
      const finalState = await waitForSettlementConfirmation(settlement.id);

      if (finalState.status === 'completed') {
        const completedSettlement = finalState.settlement || { ...settlement, status: 'completed' };
        setSettlements((p) => [completedSettlement, ...p]);
        await fetchStats();
        showNotification(`Payment of INR ${due.toFixed(2)} successful`, 'success');
      } else if (finalState.status === 'failed') {
        showNotification('Settlement payment failed. Please retry.', 'error');
      } else {
        showNotification('Settlement confirmation is pending. Refresh after a short wait.', 'warning');
      }
    } catch (err) {
      console.error('Settlement error:', err.message);
      showNotification(`Settlement failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setSettling(false);
      settlementAbortRef.current = null;
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const periodLabel = PERIODS.find(p => p.key === period)?.label || '';

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Financials</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddMoneyModal(true)}
            className="px-6 py-2 bg-[#0ceded] text-black font-bold rounded-lg hover:opacity-90 transition text-sm"
          >
            + Add Money
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition text-sm"
          >
            ↗ Withdraw
          </button>
        </div>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Wallet Balance */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-5 -bottom-10 text-9xl text-white opacity-10">₹</div>
          <div className="relative z-10">
            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">
              Wallet Balance
            </div>
            {loading
              ? <Skeleton className="h-10 w-32 mt-2" />
              : <div className="text-4xl font-bold mt-1">₹ {fmt(walletBalance)}</div>
            }
            <div className="text-emerald-100 text-[10px] mt-2">Total Revenue · {periodLabel}: ₹ {fmt(stats?.totalRevenue)}</div>
          </div>
        </div>

        {/* Your Profit */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl soft-hover">
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Your Profit · {periodLabel}
          </div>
          {loading
            ? <Skeleton className="h-9 w-28 mt-2" />
            : <div className="text-3xl font-bold text-green-400 mt-1">
                ₹ {fmt(stats?.profit)}
              </div>
          }
          <div className="text-xs text-gray-500 mt-2">
            You keep <span className="font-bold text-white">
              {stats ? `${((1 - stats.commissionRate) * 100).toFixed(0)}%` : '95%'}
            </span> of every sale.
          </div>
        </div>

        {/* Commission Due */}
        <div className="bg-slate-900 border border-red-900/30 p-6 rounded-2xl soft-hover">
          <div className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Commission Due
          </div>
          {loading
            ? <Skeleton className="h-9 w-24 mt-2" />
            : <div className="text-3xl font-bold text-white mt-1">
                ₹ {fmt(stats?.due)}
              </div>
          }
          <div className="text-xs text-gray-500 mb-4">
            Platform fee @ {stats ? `${(stats.commissionRate * 100).toFixed(0)}%` : '5%'}
          </div>
          <button
            onClick={handleSettle}
            disabled={loading || settling || !stats || (stats.due ?? 0) <= 0}
            className={`w-full py-3 rounded-xl font-bold text-xs transition
              ${!loading && !settling && stats && stats.due > 0
                ? 'bg-[#0ceded] text-black hover:opacity-90'
                : 'bg-slate-800 text-gray-500 cursor-not-allowed'
              }`}
          >
            {!loading && !settling && stats && stats.due > 0
              ? 'Pay Now & Settle'
              : settling
                ? 'Processing...'
              : 'All Dues Cleared ✅'
            }
          </button>
        </div>
      </div>

      {/* ── Settlement History ─────────────────────────────── */}
      <div>
        <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-3">
          Settlement History
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {settlements.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No transactions recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800 text-gray-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {settlements.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-800/60 transition">
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {(s.date || s.created_at) ? new Date(s.date || s.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{s.transaction_id || s.id}</td>
                    <td className="px-6 py-4 text-right text-green-400 font-bold">
                      ₹ {Number(s.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddMoneyModal && (
        <AddMoneyModal
          onClose={() => setShowAddMoneyModal(false)}
          onSuccess={(amount) => {
            setWalletBalance(prev => prev + amount);
            showNotification(`₹${amount} added to wallet successfully!`, 'success');
            fetchStats();
          }}
          notify={showNotification}
        />
      )}

      {showWithdrawModal && (
        <WithdrawMoneyModal
          currentBalance={walletBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={(withdrawalData) => {
            showNotification(`Withdrawal of ₹${withdrawalData.amount} initiated via ${withdrawalData.method}`, 'success');
            fetchStats();
          }}
          notify={showNotification}
        />
      )}
    </div>
  );
};

export default WalletPage;
