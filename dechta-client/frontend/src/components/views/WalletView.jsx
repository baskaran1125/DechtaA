import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CreditCard, ChevronRight } from 'lucide-react';

export default function WalletView({ onBack }) {
    const { userData, topUpWallet, formatINR } = useAuth();
    const [amount, setAmount] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleTopUp = () => {
        const val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            topUpWallet(val);
            setAmount('');
            setIsAdding(false);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000];

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-slate-950">
            {/* Wallet Header */}
            <div className="bg-white dark:bg-slate-900 p-6 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl">
                        <Wallet className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Available Balance</p>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                            {formatINR(userData.walletBalance)}
                        </h2>
                    </div>
                </div>

                {!isAdding ? (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-tight transition-transform active:scale-[0.98] shadow-xl shadow-slate-200 dark:shadow-none"
                    >
                        <Plus className="w-5 h-5" /> Add Money to Wallet
                    </button>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-slate-400">₹</span>
                            <input 
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-cyan-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-xl font-black focus:border-cyan-500 outline-none transition-all"
                                autoFocus
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                            {quickAmounts.map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => setAmount(amt.toString())}
                                    className="py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 transition-all active:scale-95"
                                >
                                    +{amt}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 rounded-2xl font-bold transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleTopUp}
                                disabled={!amount}
                                className="flex-[2] py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-tight shadow-lg shadow-cyan-200 dark:shadow-none disabled:opacity-50 transition-all active:scale-[0.98]"
                            >
                                Proceed to Add
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions Section */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Transaction History</h3>
                    <Clock className="w-4 h-4 text-gray-300" />
                </div>

                {userData.transactions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-gray-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {userData.transactions.map(tx => (
                            <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white leading-none mb-1">{tx.description}</p>
                                        <p className="text-xs font-medium text-gray-400">
                                            {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <p className={`font-black text-lg ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{formatINR(tx.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Promo Card */}
                <div className="mt-8 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-cyan-200 dark:shadow-none relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.98]">
                    <div className="absolute -right-6 -bottom-6 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                        <CreditCard className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">Limited Offer</div>
                        <h4 className="text-xl font-black mb-1 leading-tight">Get 10% Cashback on 1st Top-up</h4>
                        <p className="text-cyan-100 text-sm font-medium mb-4 opacity-80">Valid on additions above ₹1,000</p>
                        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-tight">Learn More <ChevronRight className="w-4 h-4" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
