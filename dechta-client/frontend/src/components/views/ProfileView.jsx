import { X, User, MapPin, LogOut, Mail, Phone, ArrowLeft, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import WalletView from './WalletView';

export default function ProfileView({ isPage = false, onBack }) {
    const { userData, updateProfile, logout, addAddress, formatINR } = useAuth();
    const [addressForm, setAddressForm] = useState(false);
    const [newAddr, setNewAddr] = useState({ tag: 'Home', text: '' });
    const [view, setView] = useState('profile'); // 'profile' or 'wallet'
    const [editingField, setEditingField] = useState(null); // 'name' or 'email'
    const [editValue, setEditValue] = useState('');

    const startEditing = (field, value) => {
        setEditingField(field);
        setEditValue(value || '');
    };

    const saveEdit = () => {
        if (editingField === 'name') {
            const initials = editValue.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            updateProfile({ name: editValue, initials });
        } else {
            updateProfile({ [editingField]: editValue });
        }
        setEditingField(null);
    };

    if (view === 'wallet') {
        return (
            <div className={`flex flex-col h-full min-h-0 ${isPage ? 'min-h-screen bg-gray-50 dark:bg-slate-950 pb-24' : ''}`}>
                <div className="px-4 py-4 flex items-center gap-4 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                    <button onClick={() => setView('profile')} className="p-1 -ml-1"><ArrowLeft className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">Dechta Wallet</h1>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <WalletView />
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full min-h-0 ${isPage ? 'min-h-screen bg-gray-50 dark:bg-slate-950 pb-24' : ''}`}>
            {/* Header for Page View */}
            {isPage && (
                <div className="px-4 py-4 flex items-center gap-4 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                    <button onClick={onBack} className="p-1 -ml-1"><ArrowLeft className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">Profile</h1>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto min-h-0 ${!isPage ? 'p-6' : 'p-4'} space-y-4`}>
                <div className="flex items-center gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center text-xl font-black text-cyan-600">
                        {userData.initials || <User className="w-8 h-8" />}
                    </div>
                    <div className="flex-1">
                        {editingField === 'name' ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="bg-gray-50 dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 rounded-lg px-2 py-1 text-sm font-bold dark:text-white w-full outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button onClick={saveEdit} className="text-[10px] font-black uppercase text-cyan-600">Save</button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between group">
                                <div>
                                    <p className="font-bold text-lg dark:text-white leading-tight">{userData.name || 'User'}</p>
                                    <p className="text-sm text-gray-500 font-medium">{userData.phone}</p>
                                </div>
                                <button onClick={() => startEditing('name', userData.name)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase text-cyan-600">Edit</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Wallet Quick Access */}
                    <button 
                        onClick={() => setView('wallet')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-2xl shadow-lg shadow-cyan-100 dark:shadow-none text-white transition-transform active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Wallet Balance</p>
                                <p className="text-xl font-black">{formatINR(userData.walletBalance)}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-60" />
                    </button>

                     <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
                        <Phone className="w-4 h-4 text-cyan-500" />
                        <span className="text-sm font-bold dark:text-white">{userData.phone || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 group">
                        <div className="flex items-center gap-3 flex-1">
                            <Mail className="w-4 h-4 text-cyan-500" />
                            {editingField === 'email' ? (
                                <input 
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    placeholder="your@email.com"
                                    className="bg-gray-50 dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 rounded-lg px-2 py-1 text-sm font-bold dark:text-white w-full outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            ) : (
                                <span className="text-sm font-bold dark:text-white">{userData.email || 'Not set'}</span>
                            )}
                        </div>
                        {editingField === 'email' ? (
                            <button onClick={saveEdit} className="ml-2 text-[10px] font-black uppercase text-cyan-600">Save</button>
                        ) : (
                            <button onClick={() => startEditing('email', userData.email)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase text-cyan-600">Edit</button>
                        )}
                    </div>
                </div>

                <div className="pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Your Addresses</h3>
                        <button onClick={() => setAddressForm(!addressForm)} className="text-xs font-bold text-cyan-600 px-3 py-1 bg-cyan-50 dark:bg-cyan-900/20 rounded-full transition-colors">+ Add New</button>
                    </div>
                    
                    {addressForm && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4 space-y-3 border border-cyan-200 dark:border-cyan-800 shadow-lg">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {['Home', 'Work', 'Other'].map(tag => (
                                    <button 
                                        key={tag}
                                        onClick={() => setNewAddr(p => ({ ...p, tag }))}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all border-2 ${
                                            newAddr.tag === tag 
                                            ? 'bg-cyan-600 border-cyan-600 text-white shadow-md' 
                                            : 'border-gray-100 dark:border-slate-800 text-gray-400 hover:border-cyan-200 dark:hover:border-cyan-800'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <input value={newAddr.text} onChange={e => setNewAddr(p => ({ ...p, text: e.target.value }))} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:border-cyan-500 outline-none" placeholder="Full address" />
                            <div className="flex gap-2">
                                <button onClick={() => setAddressForm(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 py-2.5 rounded-lg text-sm font-bold">Cancel</button>
                                <button onClick={() => { if (newAddr.text) { addAddress(newAddr); setNewAddr({ tag: 'Home', text: '' }); setAddressForm(false); } }} className="flex-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg text-sm font-bold">Save Address</button>
                            </div>
                        </div>
                    )}
                    
                    {userData.addresses.length === 0 ? (
                        <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                             <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                             <p className="text-xs font-bold text-gray-400">No addresses saved yet</p>
                        </div>
                    ) : (
                        userData.addresses.map(a => (
                            <div key={a.id} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl mb-3 border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                    <MapPin className="w-4 h-4 text-cyan-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-[10px] uppercase text-cyan-600 mb-0.5 tracking-tight">{a.tag}</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight break-words">{a.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button onClick={() => { logout(); if (onBack) onBack(); }} className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl mt-6 border-2 border-transparent hover:border-red-100 dark:hover:border-red-900/20 transition-all">
                    <LogOut className="w-4 h-4" /> Logout from Account
                </button>
            </div>
        </div>
    );
}
