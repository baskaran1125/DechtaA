import { Wallet, ClipboardList, Upload, Plus, AlertTriangle } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { useRef, useEffect } from 'react';
import { COMMISSION_LIMIT } from '../workerConstants';

export default function WalletSection() {
  const { state, setState, showToast, t } = useWorker();
  const feePaymentTimerRef = useRef<number | null>(null);

  // Cleanup payment timer on unmount
  useEffect(() => {
    return () => {
      if (feePaymentTimerRef.current) clearTimeout(feePaymentTimerRef.current);
    };
  }, []);

  return (
    <div>
      {/* Freeze Alert */}
      {state.isFrozen && (
        <div className="w-freeze-alert" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} aria-hidden="true" style={{ marginRight: 6, flexShrink: 0 }} />
          <span>{t('limit_reached_msg')}</span>
          <button className="w-btn w-btn-warning" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px' }}
            onClick={() => {
              showToast('Processing Payment...');
              if (feePaymentTimerRef.current) clearTimeout(feePaymentTimerRef.current);
              feePaymentTimerRef.current = window.setTimeout(() => {
                setState(p => ({ ...p, wallet: { ...p.wallet, fees: 0 }, isFrozen: false, isActive: true }));
                showToast('Fees Paid! Account Unlocked.', 'success');
                feePaymentTimerRef.current = null;
              }, 1500);
            }}>
            {t('pay_fees')}
          </button>
        </div>
      )}

      {/* Wallet Summary */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title">
            <Wallet size={18} aria-hidden="true" style={{ marginRight: 6 }} />
            {t('summary')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="w-btn w-btn-success" style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setState(p => ({ ...p, activeSection: 'add-money-modal' }))}>
              <Plus size={14} aria-hidden="true" style={{ marginRight: 4 }} />
              Add Money
            </button>
            <button className="w-btn w-btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => {
                const isBankVerified = state.user.isApproved || state.user.bankDetails.status === 'verified';
                if (!isBankVerified) {
                  showToast('Bank details must be Verified to withdraw funds.', 'error');
                  return;
                }
                if (state.wallet.net <= 0) { showToast('No funds available.', 'error'); return; }
                setState(p => ({ ...p, activeSection: 'withdrawal-modal' }));
              }}>
              {t('withdraw_now')}
            </button>
          </div>
        </div>
        <div className="w-stats-row">
          <div className="w-stat-box">
            <div className="w-stat-label">{t('total_earned')}</div>
            <div className="w-stat-val" style={{ color: 'var(--text-main)' }}>₹{state.wallet.gross.toFixed(2)}</div>
          </div>
          <div className="w-stat-box">
            <div className="w-stat-label">{t('platform_fees')}</div>
            <div className="w-stat-val" style={{ color: 'var(--danger)' }}>-₹{state.wallet.fees.toFixed(2)}</div>
          </div>
          <div className="w-stat-box" style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <div className="w-stat-label">{t('net_profit')}</div>
            <div className="w-stat-val" style={{ color: 'var(--success)' }}>₹{state.wallet.net.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title">
            <ClipboardList size={18} aria-hidden="true" style={{ marginRight: 6 }} />
            {t('history')}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('th_service')}</th>
              <th>{t('th_date')}</th>
              <th className="w-amount-col">{t('th_amount')}</th>
            </tr>
          </thead>
          <tbody>
            {state.transactions.length > 0 ? (
              [...state.transactions].reverse().map((tx, i) => (
                <tr key={i}>
                  <td>{tx.service}</td>
                  <td>{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="w-amount-col" style={{ color: tx.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {tx.amount < 0 ? '' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>{t('no_transactions')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Withdrawal History */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title">
            <Upload size={18} aria-hidden="true" style={{ marginRight: 6 }} />
            Withdrawal History
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('th_date')}</th>
              <th>Ref ID</th>
              <th className="w-amount-col">{t('th_amount')}</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.withdrawals.length > 0 ? (
              [...state.withdrawals].reverse().map((w, i) => (
                <tr key={i}>
                  <td>{w.date}</td>
                  <td style={{ fontWeight: 700 }}>{w.refId}</td>
                  <td className="w-amount-col" style={{ color: 'var(--danger)', fontWeight: 600 }}>-₹{w.amount}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Success</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No withdrawals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
