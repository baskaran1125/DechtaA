import { useState } from 'react';
import { useWorker } from '../WorkerContext';

interface AddMoneyModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: (amount: number) => void;
}

export default function AddMoneyModal({ open, onClose, onProceed }: AddMoneyModalProps) {
  const { showToast } = useWorker();
  const [addAmount, setAddAmount] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    const amount = parseInt(addAmount);
    if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    onProceed(amount);
    setAddAmount('');
  };

  return (
    <div className="w-modal-overlay" onClick={onClose}>
      <div className="w-modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h3>➕ Add Money to Wallet</h3>
        <p>Enter the amount you wish to add:</p>
        <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="₹ Amount"
          style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="w-btn-primary" onClick={handleConfirm} style={{ flex: 1 }}>💳 Proceed to Pay</button>
          <button className="w-btn w-btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
