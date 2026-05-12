import { useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Smartphone, CreditCard, Landmark, Wallet, Banknote, Plus, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentModal({ open, onClose, onSuccess, orderData }) {
    const { cartItems, cartTotal, finalTotal, discountAmount, couponApplied } = useCart();
    const { userData, payWithWallet, formatINR } = useAuth();
    const [activeTab, setActiveTab] = useState('dechta_wallet');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [showUpiInput, setShowUpiInput] = useState(false);
    const [upiId, setUpiId] = useState('');

    const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
    const [selectedBank, setSelectedBank] = useState('');

    const deliveryFee = Number(orderData?.delivery_fee) || 0;
    const tip = orderData?.tip || 0;
    const total = finalTotal + deliveryFee + tip;

    const handlePay = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onSuccess(cartItems, total, orderData);
        }, 1500);
    };

    const handleWalletPay = () => {
        setError('');
        if (userData.walletBalance < total) {
            setError('Insufficient wallet balance. Please top up or choose another method.');
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const success = payWithWallet(total, `Payment for ${orderData?.serviceName || 'Order'}`);
            if (success) {
                setIsProcessing(false);
                onSuccess(cartItems, total, orderData);
            } else {
                setIsProcessing(false);
                setError('Something went wrong with the wallet payment.');
            }
        }, 1200);
    };

    if (!open) return null;

    const tabs = [
        { id: 'dechta_wallet', label: 'Dechta Wallet', icon: Wallet },
        { id: 'upi', label: 'UPI', icon: Smartphone },
        { id: 'card', label: 'Debit / Credit Card', icon: CreditCard },
        { id: 'net', label: 'Net Banking', icon: Landmark },
        { id: 'wallet', label: 'Mobile Wallets', icon: Wallet },
        { id: 'cash', label: 'Cash on Delivery', icon: Banknote },
    ];

    const popularBanks = [
        { id: 'sbi', name: 'State Bank of India', img: 'https://companieslogo.com/img/orig/SBIN.NS-27e57c61.png?t=1593960269' },
        { id: 'hdfc', name: 'HDFC Bank', img: 'https://companieslogo.com/img/orig/HDB-6f4e17ef.png?t=1632832821' },
        { id: 'icici', name: 'ICICI Bank', img: 'https://companieslogo.com/img/orig/IBN-1b3334ca.png?t=1658421884' },
        { id: 'axis', name: 'Axis Bank', img: 'https://companieslogo.com/img/orig/AXISBANK.NS-0ec611db.png?t=1661852086' },
        { id: 'kotak', name: 'Kotak Mahindra', img: 'https://companieslogo.com/img/orig/KOTAKBANK.NS-9b626154.png?t=1658421884' },
    ];

    const wallets = [
        { id: 'paytm', name: 'Paytm', img: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg' },
        { id: 'phonepe', name: 'PhonePe', img: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg' },
        { id: 'amazon', name: 'Amazon Pay', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Amazon_Pay_logo.svg' },
        { id: 'freecharge', name: 'Freecharge', img: 'https://companieslogo.com/img/orig/payo.in-97a151b7.png?t=1646279183' } // fallback icon for freecharge visually
    ];

    return (
        <div className="fixed inset-0 z-[220] bg-gray-50 dark:bg-slate-950">
            {/* Processing Overlay */}
            {isProcessing && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-qc-primary animate-spin mb-4" />
                    <h2 className="text-xl font-bold dark:text-white">Processing Payment...</h2>
                    <p className="text-gray-500 mt-2">Please do not close this window</p>
                </div>
            )}

            {/* === Top Header Bar === */}
            <div className="bg-white dark:bg-slate-900 h-16 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-10 shadow-sm z-20 relative">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50">
                        <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Payment Options</h2>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 hidden md:block">100% Secure Payment</span>
                </div>
            </div>

            {/* === 3-Column Layout === */}
            <div className="max-w-6xl mx-auto h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden relative">

                {/* Left: Tab Buttons */}
                <div className="w-full md:w-1/4 bg-gray-50 dark:bg-slate-900 overflow-y-auto border-r border-gray-200 dark:border-slate-800">
                    <div className="flex flex-row md:flex-col text-sm font-medium text-gray-600 dark:text-gray-400 overflow-x-auto md:overflow-x-visible">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => !isProcessing && setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 p-5 border-l-4 md:border-l-4 border-b-2 md:border-b-0 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group whitespace-nowrap
                                        ${isActive
                                            ? 'bg-white dark:bg-slate-800 border-l-qc-yellow border-b-qc-yellow md:border-b-transparent text-black dark:text-white'
                                            : 'border-transparent'}`}>
                                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-black dark:text-white' : 'group-hover:text-black dark:group-hover:text-white'}`} />
                                    <span className={`transition-colors hidden md:inline ${isActive ? 'text-black dark:text-white font-bold' : 'group-hover:text-black dark:group-hover:text-white'}`}>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Center: Tab Content */}
                <div className="flex-1 bg-white dark:bg-slate-950 p-6 md:p-10 overflow-y-auto relative">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-shake">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {/* Dechta Wallet Tab */}
                    {activeTab === 'dechta_wallet' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Wallet className="w-32 h-32 rotate-12" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">Available Wallet Balance</p>
                                    <h3 className="text-4xl font-black mb-8">{formatINR(userData.walletBalance)}</h3>
                                    
                                    <div className="flex items-center gap-2 text-cyan-400 mb-8 p-3 bg-white/5 rounded-2xl w-fit">
                                        <ShieldCheck className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Fast & Secure Checkout</span>
                                    </div>

                                    <button 
                                        onClick={handleWalletPay}
                                        disabled={userData.walletBalance < total || isProcessing}
                                        className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-tight shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3
                                            ${userData.walletBalance >= total 
                                                ? 'bg-white text-slate-900 hover:bg-gray-100' 
                                                : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'}`}
                                    >
                                        {userData.walletBalance >= total ? 'Pay Now' : 'Insufficient Balance'}
                                    </button>
                                    
                                    {userData.walletBalance < total && (
                                        <p className="text-center mt-4 text-rose-400 text-xs font-bold animate-pulse">
                                            Need {formatINR(total - userData.walletBalance)} more to complete this payment
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                                <h4 className="font-bold mb-2 dark:text-white">Why use Dechta Wallet?</h4>
                                <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                    <li className="flex items-center gap-2">• One-click instant payments</li>
                                    <li className="flex items-center gap-2">• Guaranteed cashback on selected services</li>
                                    <li className="flex items-center gap-2">• Faster refunds to wallet balance</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* UPI Tab */}
                    {activeTab === 'upi' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold mb-6 dark:text-white">Pay by any UPI App</h3>

                            <div onClick={handlePay} className="flex justify-between items-center p-4 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-black dark:hover:border-white transition-colors">
                                <div className="flex items-center gap-4">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" className="w-10 h-10 object-contain" alt="GPay" />
                                    <span className="font-bold text-gray-800 dark:text-white">Google Pay</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>

                            <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-black dark:hover:border-white transition-colors">
                                <div className="flex items-center gap-4">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" className="w-10 h-10 object-contain" alt="PhonePe" />
                                    <span className="font-bold text-gray-800 dark:text-white">PhonePe UPI</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>

                            <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-black dark:hover:border-white transition-colors" onClick={() => setShowUpiInput(!showUpiInput)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full border border-dashed border-gray-400 flex items-center justify-center text-gray-400 transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-800 dark:text-white block">Add new UPI ID</span>
                                        <span className="text-xs text-gray-500">You need to have a registered UPI ID</span>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showUpiInput ? 'rotate-90' : ''}`} />
                            </div>

                            {showUpiInput && (
                                <form onSubmit={handlePay} className="flex gap-2 animate-fade-in mt-2">
                                    <input
                                        type="text"
                                        placeholder="Enter your UPI ID (e.g. 9876543210@ybl)"
                                        required
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="flex-1 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white"
                                    />
                                    <button type="submit" className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                                        Verify & Pay
                                    </button>
                                </form>
                            )}

                            <div className="flex items-center justify-center gap-2 my-6">
                                <div className="h-px bg-gray-200 w-full dark:bg-slate-800" />
                                <span className="text-xs text-gray-400 uppercase font-bold">OR</span>
                                <div className="h-px bg-gray-200 w-full dark:bg-slate-800" />
                            </div>

                            <div onClick={handlePay} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-black dark:hover:border-white transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <QrCode className="w-8 h-8 text-black dark:text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 dark:text-white">Scan QR Code</span>
                                        <span className="text-xs text-gray-500">Scan via any UPI app</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    )}

                    {/* Card Tab */}
                    {activeTab === 'card' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold mb-6 dark:text-white">Enter Card Details</h3>
                            <form onSubmit={handlePay} className="space-y-4 max-w-md">
                                <input
                                    type="text"
                                    required
                                    maxLength="19"
                                    placeholder="Card Number"
                                    value={cardData.number}
                                    onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') })}
                                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white tracking-widest"
                                />
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        required
                                        maxLength="5"
                                        placeholder="MM / YY"
                                        value={cardData.expiry}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                            setCardData({ ...cardData, expiry: val })
                                        }}
                                        className="w-1/2 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white"
                                    />
                                    <input
                                        type="password"
                                        required
                                        maxLength="4"
                                        placeholder="CVV"
                                        value={cardData.cvv}
                                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                                        className="w-1/2 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white"
                                    />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Card Holder Name"
                                    value={cardData.name}
                                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white"
                                />
                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-qc-yellow text-black py-4 rounded-xl font-bold hover:shadow-lg transition-all text-lg flex justify-center items-center gap-2">
                                        Pay ₹{total.toLocaleString('en-IN')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Net Banking Tab */}
                    {activeTab === 'net' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold mb-6 dark:text-white">Net Banking</h3>
                            <p className="text-sm font-bold text-gray-500 mb-4 uppercase">Popular Banks</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                {popularBanks.map(bank => (
                                    <div
                                        key={bank.id}
                                        onClick={() => setSelectedBank(bank.id)}
                                        className={`border p-4 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${selectedBank === bank.id ? 'border-qc-primary bg-qc-primary/10 shadow-sm' : 'border-gray-200 dark:border-slate-800 hover:border-gray-400 dark:hover:border-slate-600'}`}
                                    >
                                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center p-1 shadow-sm">
                                            {bank.img ? (
                                                <img src={bank.img} alt={bank.name} className="w-full h-full object-contain rounded-full" />
                                            ) : (
                                                <Landmark className="w-5 h-5 text-gray-500" />
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold text-center ${selectedBank === bank.id ? 'text-qc-primary' : 'text-gray-800 dark:text-gray-300'}`}>{bank.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="max-w-md space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase">Other Banks</p>
                                <select
                                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-black dark:focus:border-white dark:text-white appearance-none"
                                    value={selectedBank}
                                    onChange={(e) => setSelectedBank(e.target.value)}
                                >
                                    <option value="" disabled>Select from all other banks</option>
                                    <option value="pnb">Punjab National Bank</option>
                                    <option value="bob">Bank of Baroda</option>
                                    <option value="union">Union Bank of India</option>
                                    <option value="canara">Canara Bank</option>
                                </select>
                                <button
                                    onClick={handlePay}
                                    disabled={!selectedBank}
                                    className="w-full bg-qc-yellow text-black py-4 rounded-xl font-bold hover:shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                                >
                                    Pay ₹{total.toLocaleString('en-IN')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile Wallets Tab */}
                    {activeTab === 'wallet' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold mb-6 dark:text-white">Mobile Wallets</h3>
                            <div className="space-y-4">
                                {wallets.map(wallet => (
                                    <div key={wallet.id} onClick={handlePay} className="flex justify-between items-center p-4 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-black dark:hover:border-white transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center p-2 shadow-sm border border-gray-100 dark:border-slate-700">
                                                {wallet.img && wallet.img.includes('http') ? (
                                                    <img src={wallet.img} alt={wallet.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Wallet className="w-6 h-6 text-gray-500" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white text-lg">{wallet.name}</span>
                                                <span className="text-xs text-gray-500">Link account to pay</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg uppercase">
                                            Link
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cash on Delivery Tab */}
                    {activeTab === 'cash' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-8 rounded-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center mb-4">
                                    <Banknote className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-green-800 dark:text-green-400">Cash on Delivery</h3>
                                <p className="text-sm text-green-700 dark:text-green-300 mb-8 max-w-sm">Pay directly to our delivery partner in cash or via UPI when your items arrive at your location.</p>
                                <button onClick={handlePay} className="w-full md:w-auto px-12 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 hover:shadow-lg transition-all text-lg flex items-center justify-center gap-2">
                                    Confirm Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Order Summary Sidebar */}
                <div className="w-full md:w-1/4 bg-gray-50 dark:bg-slate-900 p-6 border-l border-gray-200 dark:border-slate-800 overflow-y-auto hidden md:block">
                    <div className="mb-8">
                        <img src="/dechta.png" className="h-16 md:h-20 object-contain mb-6 origin-left filter dark:brightness-200 opacity-80" alt="Dechta" />
                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">ORDER SUMMARY</div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Service Request</h3>
                    </div>

                    <div className="space-y-4 mb-6">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                                <img src={item.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=60'} className="w-10 h-10 object-contain rounded-lg bg-white dark:bg-slate-800 p-0.5 border border-gray-200 dark:border-slate-700" alt={item.name} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Qty: {item.qty}</p>
                                </div>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed border-gray-300 dark:border-slate-700 pt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-bold text-gray-900 dark:text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Convenience Fees</span>
                            <span className="font-bold text-gray-900 dark:text-white">₹{deliveryFee}</span>
                        </div>
                        {tip > 0 && (
                            <div className="flex justify-between">
                                <span className="text-cyan-600 font-bold">Driver Tip</span>
                                <span className="font-bold text-cyan-600">₹{tip}</span>
                            </div>
                        )}
                        {couponApplied && (
                            <div className="flex justify-between">
                                <span className="text-green-600 font-bold">Discount</span>
                                <span className="font-bold text-green-600">-₹{discountAmount.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-qc-yellow/10 dark:bg-qc-yellow/5 border border-qc-yellow/20 p-4 rounded-xl mt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount Payable</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white flex items-baseline gap-1">
                                ₹{total.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        100% Secure Transaction
                    </div>
                </div>
            </div>
        </div>
    );
}
