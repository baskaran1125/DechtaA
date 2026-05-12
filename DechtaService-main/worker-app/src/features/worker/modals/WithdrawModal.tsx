import { useState } from 'react';
import { useWorker } from '../WorkerContext';

interface WithdrawModalProps {
  open: boolean;
  balance: number;
  onClose: () => void;
  onWithdraw: (amount: number) => void;
}

export default function WithdrawModal({ open, balance, onClose, onWithdraw }: WithdrawModalProps) {
  const { showToast } = useWorker();
  const [withdrawAmount, setWithdrawAmount] = useState('');

  if (!open) return null;

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    if (amount > balance) { showToast('Insufficient balance.', 'error'); return; }
    onWithdraw(amount);
    setWithdrawAmount('');
  };

  return (
    <div className="w-modal-overlay" onClick={onClose}>
      <div className="w-modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h3>💸 Withdraw Funds</h3>
        <p>Current Balance: <span style={{ color: 'var(--success)', fontWeight: 700 }}>₹{balance}</span></p>
        <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="₹ Amount"
          style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="w-btn-primary" onClick={handleWithdraw} style={{ flex: 1 }}>✅ Confirm Withdrawal</button>
          <button className="w-btn w-btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
