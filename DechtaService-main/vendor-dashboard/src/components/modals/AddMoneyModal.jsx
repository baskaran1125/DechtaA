import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { createCashfreeSession, verifyCashfreePayment, createRazorpayOrder, verifyRazorpayPayment } from '../../api/apiClient';

export const AddMoneyModal = ({ onClose, onSuccess, notify }) => {
  const [amount, setAmount] = useState('1000');
  const [selectedPlan, setSelectedPlan] = useState('1000');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cashfree'); // 'razorpay' or 'cashfree'

  const predefinedAmounts = [
    { value: '500', label: '₹ 500' },
    { value: '1000', label: '₹ 1,000' },
    { value: '2500', label: '₹ 2,500' },
    { value: '5000', label: '₹ 5,000' },
    { value: '10000', label: '₹ 10,000' },
  ];

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    try {
      // Create order on backend
      const orderRes = await createRazorpayOrder(parseInt(selectedPlan));
      const orderData = orderRes?.data;
      const { orderId, currency } = orderData;

      if (!orderId) throw new Error('Failed to create order');

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY || 'YOUR_RAZORPAY_KEY',
          amount: parseInt(selectedPlan) * 100,
          currency: currency || 'INR',
          order_id: orderId,
          name: 'DECHTA Vendor',
          description: `Add ₹ ${selectedPlan} to Wallet`,
          handler: async (paymentResponse) => {
            try {
              // Verify payment on backend
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              });

              if (verifyRes?.data?.success) {
                setProcessing(false);
                setCompleted(true);
                setTimeout(() => {
                  onSuccess && onSuccess(parseInt(selectedPlan));
                  onClose();
                }, 1500);
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (error) {
              notify?.(error.message || 'Payment verification failed', 'error');
              setProcessing(false);
            }
          },
          prefill: {
            email: localStorage.getItem('vendor_email') || '',
            contact: localStorage.getItem('vendor_phone') || '',
          },
          theme: { color: '#0ceded' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Payment error:', error);
      notify?.(error.message || 'Payment failed. Please try again.', 'error');
      setProcessing(false);
    }
  };

  const handleCashfreePayment = async () => {
    setProcessing(true);
    try {
      const vendorEmail = localStorage.getItem('vendor_email') || 'vendor@dechta.com';
      const vendorPhone = localStorage.getItem('vendor_phone') || '9999999999';

      // Create session on backend
      const sessionRes = await createCashfreeSession(parseInt(selectedPlan), vendorEmail, vendorPhone);
      const sessionData = sessionRes?.data;
      const { paymentLink, sessionId } = sessionData;

      console.log('Cashfree session response:', { paymentLink, sessionId });

      // Method 1: If we have a direct payment link, use it (most reliable)
      if (paymentLink) {
        const paymentWindow = window.open(paymentLink, '_blank', 'noopener,noreferrer');
        if (!paymentWindow) {
          window.location.href = paymentLink;
        }
        setProcessing(false);
        notify?.('Opening secure payment gateway...', 'info');
        setTimeout(() => onClose(), 1000);
        return;
      }

      // Method 2: Fallback to Razorpay if no payment link
      if (!sessionId) {
        throw new Error('Payment gateway not configured. Please use Razorpay.');
      }

      notify?.('Switching to Razorpay (direct link unavailable)...', 'info');
      setTimeout(() => {
        setPaymentMethod('razorpay');
        setProcessing(false);
      }, 800);

    } catch (error) {
      console.error('Cashfree payment error:', error);
      notify?.(error.message || 'Cashfree unavailable. Switching to Razorpay.', 'error');
      setPaymentMethod('razorpay');
      setProcessing(false);
    }
  };

  const handlePaymentClick = () => {
    if (paymentMethod === 'cashfree') {
      handleCashfreePayment();
    } else {
      handleRazorpayPayment();
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 fade-in">
      {completed ? (
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl modal-slide-up border border-green-500/50">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 text-2xl">
            <Icons.CheckCircle />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Money Added!</h3>
          <p className="text-gray-500 mt-2 text-sm">₹ {selectedPlan} has been added to your wallet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl modal-slide-up flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0ceded] to-cyan-500 p-6 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2">
              <span className="text-xl">✕</span>
            </button>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-[#0ceded] text-2xl font-bold">
                +
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Add Money to Wallet</h2>
            <p className="text-white/80 text-sm mt-1">Instant funding with secure payment</p>
          </div>

          {/* Content */}
          <div className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto rounded-t-3xl -mt-4 relative z-10">
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Select Amount
              </label>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {predefinedAmounts.map((plan) => (
                  <button
                    key={plan.value}
                    onClick={() => { setSelectedPlan(plan.value); setAmount(plan.value); }}
                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      selectedPlan === plan.value
                        ? 'border-[#0ceded] bg-[#0ceded]/10 text-[#0ceded] dark:bg-[#0ceded]/20'
                        : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-[#0ceded]'
                    }`}
                  >
                    {plan.label}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-5 block">
                Custom Amount
              </label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val);
                    setSelectedPlan(val);
                  }}
                  min="100"
                  max="100000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:border-[#0ceded]"
                  placeholder="Enter custom amount"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6 space-y-3">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Payment Method
              </label>

              {/* Cashfree Option */}
              <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all"
                style={{
                  borderColor: paymentMethod === 'cashfree' ? '#0ceded' : '#e5e7eb',
                  backgroundColor: paymentMethod === 'cashfree' ? 'rgba(12, 237, 237, 0.05)' : 'transparent'
                }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'cashfree'}
                  onChange={() => setPaymentMethod('cashfree')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Cashfree Secure</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Fastest Payment Gateway in India</div>
                </div>
              </label>

              {/* Razorpay Option */}
              <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all"
                style={{
                  borderColor: paymentMethod === 'razorpay' ? '#0ceded' : '#e5e7eb',
                  backgroundColor: paymentMethod === 'razorpay' ? 'rgba(12, 237, 237, 0.05)' : 'transparent'
                }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Razorpay Secure</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Instant & Secure Payment</div>
                </div>
              </label>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Icons.CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Instant credit to wallet</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Icons.CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>UPI, Cards & Netbanking supported</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Icons.CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>256-bit SSL encrypted</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 space-y-3">
            <button
              onClick={handlePaymentClick}
              disabled={processing || !selectedPlan || parseInt(selectedPlan) < 100}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition text-lg ${
                processing || !selectedPlan || parseInt(selectedPlan) < 100
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-800 dark:text-gray-500'
                  : 'bg-[#0ceded] text-black hover:opacity-90'
              }`}
            >
              {processing ? 'Processing...' : `Pay ₹ ${selectedPlan || '0'}`}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-700 dark:text-gray-300 font-semibold py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
