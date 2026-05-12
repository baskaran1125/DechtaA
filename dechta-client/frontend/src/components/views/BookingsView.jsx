import { useState, useRef } from 'react';
import { PackageSearch, CheckCircle2, Loader2, FileText, HelpCircle, Star, Lock, Unlock, Clock, Mic, Play, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Invoice from '../Invoice';

export default function BookingsView({ isPage = false, onBack }) {
    const { userData, updateBookingStatus, addProductRating } = useAuth();
    const { showToast } = useToast();
    const [revealedOTPs, setRevealedOTPs] = useState({});
    const [isPrinting, setIsPrinting] = useState(false);
    const [printingBooking, setPrintingBooking] = useState(null);

    const navigateToServices = () => {
        if (isPage) onBack();
        document.getElementById('services-slider')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleRevealOTP = (bookingId) => {
        setRevealedOTPs(prev => ({ ...prev, [bookingId]: true }));
    };

    const handleDownloadInvoice = (booking) => {
        setPrintingBooking(booking);
        setIsPrinting(true);
        // Small timeout to allow the invoice to render before printing
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setPrintingBooking(null);
        }, 300);
    };

    return (
        <div className={`flex flex-col h-full min-h-screen ${isPage ? 'bg-gray-50 dark:bg-slate-950 pb-24' : ''}`}>
            {/* CSS for print mode */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #invoice-print-section, #invoice-print-section * { visibility: visible; }
                    #invoice-print-section { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        height: 100%;
                        background: white !important;
                        z-index: 9999;
                    }
                    .no-print { display: none !important; }
                }
            ` }} />

            {/* Hidden Print Section */}
            {isPrinting && printingBooking && (
                <div id="invoice-print-section" className="fixed inset-0 bg-white z-[9999] overflow-auto">
                    <Invoice booking={printingBooking} userData={userData} />
                </div>
            )}

            {/* Header for Page View */}
            {isPage && (
                <div className="px-4 py-3 flex items-center gap-4 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 mb-2 no-print">
                    <button onClick={onBack} className="p-1 -ml-1"><ArrowLeft className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">Your Bookings</h1>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto ${!isPage ? 'p-0' : 'p-2'} no-print`}>
                {userData?.bookings?.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><PackageSearch className="w-8 h-8 text-gray-300 dark:text-gray-500" /></div>
                        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No Orders Yet</h4>
                        <p className="text-sm">Start shopping to track your orders here.</p>
                        <button onClick={navigateToServices} className="mt-6 text-yellow-500 font-bold text-sm hover:underline">Browse Services</button>
                    </div>
                ) : (
                    userData?.bookings?.map(b => {
                        const steps = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];
                        // Map backend status to display status
                        const statusMap = {
                            'Placed': 'Placed',
                            'Processing': 'Processing',
                            'Dispatched': 'Out for Delivery',
                            'Delivered': 'Delivered'
                        };
                        const displayStatus = statusMap[b.status] || b.status;
                        const currentStepIdx = steps.indexOf(displayStatus) === -1 ? 0 : steps.indexOf(displayStatus);
                        const step = currentStepIdx + 1;
                        const hasDeliveryOtp = Boolean(b.deliveryOtp || b.delivery_otp);
                        const deliveryOtp = b.deliveryOtp || b.delivery_otp || '';

                        return (
                            <div key={b.id} className="p-5 border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900 rounded-xl mb-3 shadow-sm mx-2">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                                            Order #QC{b.id}
                                            <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">{b.date}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total: <span className="font-bold text-black dark:text-white">₹{b.total}</span></div>
                                    </div>
                                    {step === 4 ? (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {displayStatus || 'Placed'}</span>
                                    )}
                                </div>

                                <div className="flex gap-3 overflow-x-auto pb-2 mb-4 hide-scroll">
                                    {b.items?.map((i, idx) => (
                                        <div key={idx} className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-1.5 rounded-lg shrink-0">
                                                <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                    <img src={i.img || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100'} className="w-full h-full object-cover" alt={i.name} />
                                                </div>
                                                <div className="text-xs font-bold dark:text-white pr-2 whitespace-nowrap">{i.name} <span className="text-gray-400 font-normal">x{i.qty}</span></div>
                                            </div>
                                            {step === 4 && (
                                                <div className="flex items-center gap-1 mt-1 justify-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button key={star} onClick={() => {
                                                            addProductRating(i.id, star);
                                                            showToast(`Rated ${i.name} ${star} stars!`);
                                                        }}>
                                                            <Star className={`w-3 h-3 ${userData.ratings?.[i.id] >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-4 space-y-2.5">
                                    {b.isScheduled && (
                                        <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                            <div className="p-1.5 bg-blue-500 rounded-lg"><Clock className="w-3 h-3 text-white" /></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Scheduled Delivery</p>
                                                <p className="text-xs font-bold dark:text-white">{b.date} at {b.time}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!b.isScheduled && b.estimated_eta && (
                                        <div className="flex items-center gap-2 p-2.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20 shadow-sm animate-pulse">
                                            <div className="p-1.5 bg-indigo-500 rounded-lg"><Clock className="w-3 h-3 text-white" /></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Estimated Arrival</p>
                                                <p className="text-xs font-black dark:text-white">{b.estimated_eta}</p>
                                            </div>
                                        </div>
                                    )}
                                    {b.instructions && (
                                        <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-2"><FileText className="w-3 h-3 text-gray-400" /><span className="text-[10px] font-black uppercase text-gray-400">Delivery Instructions</span></div>
                                            <div className="space-y-2">
                                                {b.instructions.quick && <span className="inline-block bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded text-[9px] font-black uppercase">{b.instructions.quick}</span>}
                                                {b.instructions.custom && <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic border-l-2 border-gray-200 dark:border-slate-700 pl-2">"{b.instructions.custom}"</p>}
                                                {b.instructions.voiceUrl && (
                                                    <div className="flex items-center justify-between mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-2"><Mic className="w-3 h-3 text-cyan-500 animate-pulse" /><span className="text-[10px] font-bold dark:text-white">Voice Note</span></div>
                                                        <button onClick={() => new Audio(b.instructions.voiceUrl).play()} className="p-1 px-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md text-[9px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-sm"><Play className="w-2.5 h-2.5 fill-current" /> PLAY</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {b.tip > 0 && (
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                            <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-black italic">₹</div>
                                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Driver Tip of ₹{b.tip} included</span>
                                        </div>
                                    )}
                                </div>

                                <div className="relative pl-4 border-l-2 border-gray-100 dark:border-slate-700 space-y-6 my-4 ml-2">
                                    {[
                                        { t: 'Order Placed', d: b.date },
                                        { t: 'Processing', d: step === 2 ? 'Packing items...' : '' },
                                        { t: 'Out for Delivery', d: step === 3 ? 'Driver on the way' : '' },
                                        { t: 'Delivered', d: step === 4 ? `Delivered on ${b.date}` : '' }
                                    ].map((s, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${step > i ? 'bg-green-500' : 'bg-gray-300'} z-10`} />
                                            <div className={`text-xs font-bold ${step > i ? 'text-black dark:text-white' : 'text-gray-400'}`}>{s.t}</div>
                                            {s.d && <div className={`text-[10px] ${step === i + 1 ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`}>{s.d}</div>}
                                        </div>
                                    ))}
                                    <div className="absolute top-0 -left-[2px] w-[2px] bg-green-500 transition-all duration-1000 z-0" style={{ height: `${(Math.max(0, step - 1) / 3) * 100}%` }} />
                                </div>

                                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => handleDownloadInvoice(b)} className="text-xs font-bold text-cyan-600 flex items-center gap-1.5 hover:underline transition-all active:scale-95"><FileText className="w-3.5 h-3.5" /> Download Invoice</button>
                                        <button onClick={() => showToast('Opening Support...')} className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"><HelpCircle className="w-3 h-3" /> Support</button>
                                    </div>
                                    <div className="flex gap-2">
                                        {step < 4 ? (
                                            <>
                                                <button onClick={() => {
                                                    const nextStatus = steps[currentStepIdx + 1];
                                                    updateBookingStatus(b.id, nextStatus);
                                                    showToast(`Order status updated to ${nextStatus}`);
                                                }} className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">Next Step (Demo)</button>
                                                {hasDeliveryOtp ? (
                                                    <div className="relative flex-1 h-[36px] overflow-hidden rounded-lg shadow-lg shadow-cyan-500/20 group">
                                                        <div className="absolute inset-0 bg-gray-100 dark:bg-slate-800 flex items-center justify-center gap-2 font-mono font-bold text-lg tracking-widest text-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg"><Unlock className="w-4 h-4 text-green-500" /> {deliveryOtp}</div>
                                                        <button onClick={() => handleRevealOTP(b.id)} className={`absolute inset-0 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-700 ease-out z-10 ${revealedOTPs[b.id] ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}><Lock className="w-3 h-3" /> Show Delivery OTP</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 h-[36px] rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-[10px] font-bold text-gray-500 dark:text-gray-300 flex items-center justify-center px-2 text-center">
                                                        Delivery OTP will appear when your order is out for delivery
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <button onClick={() => showToast('Feedback submitted!')} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-bold dark:text-white flex items-center justify-center gap-2"><Star className="w-3 h-3" /> Submit Feedback</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
