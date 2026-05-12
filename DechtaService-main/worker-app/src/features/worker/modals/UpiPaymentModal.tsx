import { useState, useRef, useEffect } from 'react';
import { useWorker } from '../WorkerContext';

interface UpiPaymentModalProps {
  open: boolean;
  amount: number;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

export default function UpiPaymentModal({ open, amount, onClose, onSuccess }: UpiPaymentModalProps) {
  const { showToast } = useWorker();
  const [upiId, setUpiId] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const upiTimerRef = useRef<number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (upiTimerRef.current) clearTimeout(upiTimerRef.current);
    };
  }, []);

  if (!open) return null;

  const handleSubmit = () => {
    if (!upiId.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)', 'error'); return; }
    setRedirecting(true);
    showToast('Connecting to UPI App...', 'warning');
    if (upiTimerRef.current) clearTimeout(upiTimerRef.current);
    upiTimerRef.current = window.setTimeout(() => {
      onSuccess(amount);
      setUpiId('');
      setRedirecting(false);
      upiTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="w-modal-overlay" onClick={onClose}>
      <div className="w-modal-content" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <h3>💳 UPI Payment</h3>
        {!redirecting ? (
          <>
            <p style={{ color: 'var(--success)', fontSize: 24, fontWeight: 800 }}>₹{amount}</p>
            <p>Enter your UPI ID:</p>
            <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="example@upi"
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', textAlign: 'center', fontFamily: 'inherit', marginBottom: 16 }} />
            <button className="w-btn-primary" onClick={handleSubmit}>🔗 Request Payment</button>
          </>
        ) : (
          <div style={{ padding: 40 }}>
            <div style={{ fontSize: 48, animation: 'wFloat 1.5s ease infinite' }}>📱</div>
            <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Redirecting to your UPI App...</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Complete the payment in your banking app</p>
          </div>
        )}
      </div>
    </div>
  );
}
