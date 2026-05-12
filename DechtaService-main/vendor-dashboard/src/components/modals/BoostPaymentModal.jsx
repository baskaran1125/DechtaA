import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';

export const BoostPaymentModal = ({ product, onClose, onConfirm }) => {
  const [plan, setPlan]         = useState('30days');
  const [processing, setProc]   = useState(false);
  const [completed, setDone]    = useState(false);
  const amount = plan==='30days' ? 399 : 249;

  const handlePay = () => {
    setProc(true);
    setTimeout(() => { setProc(false); setDone(true); setTimeout(()=>onConfirm(product.id),1500); }, 2000);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 fade-in">
      {completed ? (
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl modal-slide-up border border-green-500/50">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-4"><Icons.CheckCircle /></div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Boost Active!</h3>
          <p className="text-gray-500 mt-2 text-sm">"{product.name}" is now being promoted.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl modal-slide-up flex flex-col max-h-[90vh]">
          <div className="bg-[#FFF9C4] p-6 text-center pb-8 relative">
            <button onClick={onClose} className="absolute top-4 left-4 text-black hover:bg-black/10 rounded-full p-2">✕</button>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-[#0ceded] rounded-2xl rotate-12 flex items-center justify-center shadow-lg text-black">
                <span className="text-3xl font-bold">%</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reach more buyers and sell faster</h2>
            <p className="text-gray-600 text-sm mt-1">Buy any package and call buyers instantly</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto rounded-t-3xl -mt-4 relative z-10">
            <h3 className="font-bold text-lg dark:text-white mb-4">Feature Ad</h3>
            <div className="space-y-4">
              {[
                { key:'30days', days:30, price:399, original:665, tag:'-40%', sub:'15 Buyers Guaranteed or Money back*' },
                { key:'15days', days:15, price:249, original:415, tag:'-40%', sub:'Reach up to 6 times more buyers', badge:'Best Value' },
              ].map(p => (
                <div key={p.key} onClick={() => setPlan(p.key)}
                  className={`border rounded-xl p-4 relative cursor-pointer transition-all ${plan===p.key ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-slate-700'}`}>
                  <div className="absolute top-0 right-0 bg-[#0ceded] text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">{p.tag}</div>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${plan===p.key ? 'border-blue-600' : 'border-gray-400'}`}>
                      {plan===p.key && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">Featured Ad {p.days} days</div>
                          {p.badge && <span className="text-[10px] bg-blue-600 text-white px-1.5 rounded mt-1 inline-block">{p.badge}</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-lg">₹{p.price}</div>
                          <div className="text-gray-400 line-through text-xs">₹{p.original}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                        <Icons.CheckCircle /><span>{p.sub}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
            <button onClick={handlePay} disabled={processing}
              className="w-full bg-[#0056b3] hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg">
              {processing ? 'Processing...' : `Pay ₹ ${amount}`}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
