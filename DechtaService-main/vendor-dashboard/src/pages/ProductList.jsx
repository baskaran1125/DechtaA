import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Icons } from '../components/ui/Icons';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { BoostPaymentModal } from '../components/modals/BoostPaymentModal';

const ProductList = ({ products, setView, toggleActive, onBoost, onEdit }) => {
  const [boostProduct, setBoostProduct] = useState(null);
  const [showPending,  setShowPending]  = useState(true);
  const [showRejected, setShowRejected] = useState(false);
  const getStatus = (p) => {
    const raw = String(
      p.approval_status ?? p.approvalStatus ?? p.status ?? p.verification_status ?? 'pending'
    ).trim().toLowerCase();

    if (['approved', 'verified', 'active', 'accepted'].includes(raw)) return 'approved';
    if (['rejected', 'declined', 'denied', 'inactive', 'suspended'].includes(raw)) return 'rejected';
    return 'pending';
  };
  const approved  = products.filter(p => getStatus(p)==='approved');
  const pending   = products.filter(p => getStatus(p)==='pending');
  const rejected  = products.filter(p => getStatus(p)==='rejected');

  const renderGrid = (items, empty) => (
    <div className="grid gap-4">
      {items.length===0
        ? <div className="text-center py-8 text-gray-400 text-xs italic border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">{empty}</div>
        : items.map((p, idx) => (
          <div key={p.id || `prod-${idx}`}
            className={`flex items-center justify-between p-5 rounded-2xl border transition duration-300 relative overflow-hidden ${p.is_active ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800' : 'bg-gray-50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 opacity-60 grayscale'} ${p.isBoosted ? 'border-[#0ceded] ring-1 ring-[#0ceded]/20' : ''}`}>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-gray-500">
                {p.images?.length ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Icons.Tool />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg text-gray-800 dark:text-white">{p.name}</div>
                  {p.isBoosted && <span className="text-[10px] bg-[#0ceded] text-black px-2 py-0.5 rounded font-bold uppercase">Boosted 🚀</span>}
                  {p.isBulk   && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase">Bulk {p.bulkDiscount}%</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">HSN: {p.hsn} • {p.category}</div>
                <div className="text-xs text-yellow-500 mt-1">{Array(p.rating||5).fill('★').join('')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="text-right hidden sm:block">
                <div className="font-bold text-[#0ceded] text-lg">₹ {p.price}</div>
                <div className={`text-[10px] font-bold ${p.stock<5?'text-red-500':'text-green-500'}`}>{p.stock} in stock</div>
              </div>
              {getStatus(p)==='rejected' && (
                <button onClick={() => alert(`Rejection: ${p.rejectionReason || p.rejection_reason || 'Not provided'}`)}
                  className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200">
                  <Icons.AlertTriangle />
                </button>
              )}
              <button onClick={() => onEdit(p)} className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200 p-2 rounded-lg" title="Edit"><Icons.Pencil /></button>
              <button onClick={() => !p.isBoosted && setBoostProduct(p)} disabled={p.isBoosted}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${p.isBoosted ? 'bg-transparent border-transparent text-gray-400 cursor-default' : 'bg-black text-white border-black hover:bg-gray-800 dark:bg-white dark:text-black'}`}>
                {p.isBoosted ? 'Active ✅' : 'Boost 🚀'}
              </button>
              <ToggleSwitch checked={p.is_active} onChange={() => toggleActive(p.id)} />
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <div className="p-6 fade-in h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
      {boostProduct && <BoostPaymentModal product={boostProduct} onClose={() => setBoostProduct(null)} onConfirm={id => { onBoost(id); setBoostProduct(null); }} />}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Catalog</h2>
        <button onClick={() => setView('add-product')} className="bg-[#0ceded] text-black px-5 py-2 rounded-xl text-sm font-bold shadow hover:opacity-90">Add Item</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-4">
          {/* Approved Products Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icons.CheckCircle className="text-green-500" /><h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">Approved Products ({approved.length})</h3>
            </div>
            {renderGrid(approved, 'No approved products found.')}
          </div>

          {/* Review Status Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-4">Review Status</h3>
            <div className="space-y-3">
              {/* Pending Approval */}
              <div className="border border-yellow-200 dark:border-yellow-900/30 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <button onClick={() => setShowPending(!showPending)}
                  className="w-full flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <div className="font-bold text-yellow-800 dark:text-yellow-500">Pending Approval</div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-600 mt-0.5">{pending.length} items waiting</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-yellow-100 dark:bg-slate-800 text-yellow-700 dark:text-yellow-500 font-bold text-xs px-3 py-1.5 rounded-lg font-mono">{pending.length}</span>
                    <span className={`transform transition-transform duration-300 text-yellow-600 dark:text-yellow-500 ${showPending?'rotate-180':''}`}>▼</span>
                  </div>
                </button>
                {showPending && <div className="p-4 bg-white dark:bg-slate-950 border-t border-yellow-100 dark:border-yellow-900/30 space-y-3">
                  {renderGrid(pending,'No pending items.')}
                </div>}
              </div>

              {/* Rejected Products */}
              <div className="border border-red-200 dark:border-red-900/30 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <button onClick={() => setShowRejected(!showRejected)}
                  className="w-full flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">❌</span>
                    <div>
                      <div className="font-bold text-red-800 dark:text-red-500">Rejected Products</div>
                      <div className="text-xs text-red-700 dark:text-red-600 mt-0.5">{rejected.length} items need review</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-red-100 dark:bg-slate-800 text-red-700 dark:text-red-500 font-bold text-xs px-3 py-1.5 rounded-lg font-mono">{rejected.length}</span>
                    <span className={`transform transition-transform duration-300 text-red-600 dark:text-red-500 ${showRejected?'rotate-180':''}`}>▼</span>
                  </div>
                </button>
                {showRejected && <div className="p-4 bg-white dark:bg-slate-950 border-t border-red-100 dark:border-red-900/30 space-y-3">
                  {renderGrid(rejected,'No rejected items.')}
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProductList;
