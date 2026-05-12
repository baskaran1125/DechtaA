import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import api from '../../api/apiClient';

export const WithdrawMoneyModal = ({ currentBalance, onClose, onSuccess, notify }) => {
  const [step, setStep] = useState('amount'); // amount | bank | confirm | success
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    upiId: '',
    accountNumber: '',
    ifscCode: '',
    accountName: '',
  });
  const [processing, setProcessing] = useState(false);

  const minWithdrawal = 100;
  const maxWithdrawal = currentBalance || 0;
  const isValidAmount = amount && parseInt(amount) >= minWithdrawal && parseInt(amount) <= maxWithdrawal;

  const handleAmountSubmit = () => {
    if (!isValidAmount) {
      notify?.('Enter valid amount (₹100 - ₹' + maxWithdrawal.toFixed(0) + ')', 'error');
      return;
    }
    setStep('bank');
  };

  const handleBankDetailsSubmit = async () => {
    if (!bankDetails.upiId && !bankDetails.accountNumber) {
      notify?.('Enter UPI ID or bank account details', 'error');
      return;
    }
    
    if (bankDetails.accountNumber && (!bankDetails.ifscCode || !bankDetails.accountName)) {
      notify?.('Bank account requires IFSC code and account name', 'error');
      return;
    }

    setStep('confirm');
  };

  const handleWithdrawal = async () => {
    setProcessing(true);
    try {
      await api.post('/vendors/wallet/withdraw', {
        amount: parseInt(amount),
        withdrawalMethod: bankDetails.upiId ? 'upi' : 'bank',
        upiId: bankDetails.upiId || undefined,
        accountNumber: bankDetails.accountNumber || undefined,
        ifscCode: bankDetails.ifscCode || undefined,
        accountName: bankDetails.accountName || undefined,
      });

      setProcessing(false);
      setStep('success');
      
      setTimeout(() => {
        onSuccess?.({
          amount: parseInt(amount),
          method: bankDetails.upiId ? 'UPI' : 'Bank Transfer',
        });
        onClose();
      }, 2000);
    } catch (error) {
      setProcessing(false);
      notify?.(error.message || 'Withdrawal failed', 'error');
    }
  };

  const getProcessingTime = () => {
    const method = bankDetails.upiId ? 'UPI' : 'Bank';
    return method === 'UPI' ? '5 minutes' : '1-2 business days';
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 fade-in">
      {step === 'success' ? (
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl modal-slide-up border border-green-500/50">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 text-2xl">
            <Icons.CheckCircle />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Withdrawal Initiated!</h3>
          <p className="text-gray-500 mt-2 text-sm">₹ {amount || '0'} will reach your {bankDetails.upiId ? 'UPI' : 'bank account'}</p>
          <p className="text-gray-400 mt-2 text-xs">Processing in {getProcessingTime()}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl modal-slide-up flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2">
              <span className="text-xl">✕</span>
            </button>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-orange-600 text-2xl font-bold">
                ↗
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Withdraw from Wallet</h2>
            <p className="text-white/80 text-sm mt-1">Fast & secure withdrawal</p>
          </div>

          {/* Content */}
          <div className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto rounded-t-3xl -mt-4 relative z-10">
            {/* Current Balance */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl mb-6 border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Available Balance</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹ {currentBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
            </div>

            {/* Step 1: Amount */}
            {step === 'amount' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Withdrawal Amount (Min: ₹{minWithdrawal} | Max: ₹{maxWithdrawal.toFixed(0)})
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={minWithdrawal}
                      max={maxWithdrawal}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:border-orange-600"
                      placeholder="Enter amount"
                    />
                  </div>
                  {amount && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Processing fee: <span className="font-bold">FREE</span> | Net: ₹ <span className="font-bold">{amount}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAmountSubmit}
                  disabled={!isValidAmount}
                  className={`w-full font-bold py-3 rounded-xl transition ${
                    isValidAmount
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-800'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Bank Details */}
            {step === 'bank' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-4">
                  <div className="font-bold text-gray-900 dark:text-white text-sm mb-3">Choose Withdrawal Method</div>
                  
                  {/* UPI Option */}
                  <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition mb-3 border-2" style={{borderColor: bankDetails.upiId && !bankDetails.accountNumber ? '#0ceded' : '#e5e7eb'}}>
                    <input
                      type="radio"
                      checked={!!bankDetails.upiId && !bankDetails.accountNumber}
                      onChange={() => setBankDetails({ ...bankDetails, upiId: '', accountNumber: '', ifscCode: '', accountName: '' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">Via UPI (Recommended)</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Instant - Money in your account within 5 minutes</div>
                    </div>
                  </label>

                  {/* Bank Option */}
                  <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition border-2" style={{borderColor: bankDetails.accountNumber ? '#0ceded' : '#e5e7eb'}}>
                    <input
                      type="radio"
                      checked={!!bankDetails.accountNumber}
                      onChange={() => setBankDetails({ ...bankDetails, upiId: '', accountNumber: '', ifscCode: '', accountName: '' })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">Via Bank Transfer</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">1-2 business days - Most reliable</div>
                    </div>
                  </label>
                </div>

                {/* UPI Input */}
                {!bankDetails.accountNumber && (
                  <input
                    type="text"
                    placeholder="Enter UPI ID (e.g., name@bankname)"
                    value={bankDetails.upiId}
                    onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0ceded]"
                  />
                )}

                {/* Bank Transfer Inputs */}
                {bankDetails.accountNumber !== '' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0ceded]"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0ceded]"
                    />
                    <input
                      type="text"
                      placeholder="IFSC Code (e.g., SBIN0001234)"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0ceded]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={() => setStep('amount')}
                    className="font-bold py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleBankDetailsSubmit}
                    disabled={!bankDetails.upiId && !bankDetails.accountNumber}
                    className={`font-bold py-3 rounded-xl transition ${
                      bankDetails.upiId || bankDetails.accountNumber
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-800'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <div className="font-bold text-yellow-900 dark:text-yellow-400 text-sm mb-2">Withdrawal Summary</div>
                  <div className="space-y-1 text-xs text-yellow-800 dark:text-yellow-300">
                    <div className="flex justify-between"><span>Amount:</span><span className="font-bold">₹ {amount}</span></div>
                    <div className="flex justify-between"><span>Fee:</span><span className="font-bold">Nil</span></div>
                    <div className="flex justify-between border-t border-yellow-300 dark:border-yellow-700 pt-1 mt-1"><span>You'll receive:</span><span className="font-bold">₹ {amount}</span></div>
                    <div className="flex justify-between"><span>Method:</span><span className="font-bold">{bankDetails.upiId ? 'UPI Transfer' : 'Bank Transfer'}</span></div>
                    <div className="flex justify-between"><span>Time:</span><span className="font-bold">{getProcessingTime()}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={() => setStep('bank')}
                    disabled={processing}
                    className="font-bold py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleWithdrawal}
                    disabled={processing}
                    className={`font-bold py-3 rounded-xl transition ${
                      processing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-800'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {processing ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
