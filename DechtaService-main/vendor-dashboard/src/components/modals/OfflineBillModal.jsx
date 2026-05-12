import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { HARDWARE_DB } from '../../data/hardwareDB';

export const OfflineBillModal = ({ products, onClose, onGenerate }) => {
  const [cart, setCart]             = useState([]);
  const [searchTerm, setSearch]     = useState('');
  const [selectedProduct, setSelected] = useState(null);
  const [showDropdown, setDropdown] = useState(false);
  const [qty, setQty]               = useState(1);
  const [unitPrice, setUnitPrice]   = useState('');
  const [customerName, setCustName] = useState('');
  const [customerPhone, setCustPhone] = useState('');
  const [customerGst, setCustGst]   = useState('');
  const [address, setAddress]       = useState('');

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase().trim();
    if (!t) return [];
    const inv = products.filter(p => p.active && p.name.toLowerCase().includes(t));
    const invNames = new Set(inv.map(p => p.name.toLowerCase()));
    const global = HARDWARE_DB
      .filter(h => h.name.toLowerCase().includes(t) && !invNames.has(h.name.toLowerCase()))
      .map(h => ({ ...h, id:`global_${h.name}`, price:'', stock:'N/A', isGlobal:true }));
    return [...inv, ...global];
  }, [searchTerm, products]);

  const handleSelect = (p) => { setSelected(p); setSearch(p.name); setUnitPrice(p.price||''); setDropdown(false); };

  const addToCart = () => {
    if (!selectedProduct) return alert('Select a product');
    if (!unitPrice||Number(unitPrice)<=0) return alert('Enter a valid price');
    setCart(c => [...c, {
      productName: selectedProduct.name, hsn: selectedProduct.hsn||'',
      price: Number(unitPrice), quantity: Number(qty),
      gst: Number(selectedProduct.gstPercent||selectedProduct.gst||18),
      total: Number(unitPrice)*Number(qty),
    }]);
    setSelected(null); setSearch(''); setQty(1); setUnitPrice('');
  };

  const total = cart.reduce((s,i) => s+i.total, 0);

  const handleGenerate = () => {
    if (!cart.length) return alert('Cart is empty');
    onGenerate({ customerName, customerPhone, customerGst, address, items:cart, totalAmount:total });
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl modal-slide-up border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold dark:text-white">New Offline Bill</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition px-2">✕</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6 relative">
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wide">Select Product</label>
            <div className="relative">
              <input type="text" placeholder="Type product name..."
                value={searchTerm}
                onChange={e => { setSearch(e.target.value); setDropdown(true); setSelected(null); }}
                onFocus={() => setDropdown(true)}
                className="w-full p-3 pl-10 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#0ceded]/50 outline-none"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
            {showDropdown && searchTerm && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto no-scrollbar">
                {filtered.length===0
                  ? <div className="p-3 text-sm text-gray-500 text-center">No matching products.</div>
                  : filtered.map((p,i) => (
                    <div key={p.id||i} onClick={() => handleSelect(p)}
                      className="p-3 hover:bg-[#0ceded]/10 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 dark:text-white">{p.name}</span>
                        {p.isGlobal && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded font-bold">Global</span>}
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">{p.category}</span>
                        {!p.isGlobal
                          ? <span className={`${p.stock<5?'text-red-500':'text-green-500'} font-bold`}>Stock: {p.stock}</span>
                          : <span className="text-gray-400 italic">Set price manually</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setDropdown(false)} />}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wide">Price (₹)</label>
              <input type="number" placeholder="0.00" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}
                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#0ceded]/50 outline-none font-bold"/>
            </div>
            <div className="w-20">
              <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wide">Qty</label>
              <input type="number" min="1" value={qty} onChange={e=>setQty(parseInt(e.target.value)||1)}
                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#0ceded]/50 outline-none text-center"/>
            </div>
            <button onClick={addToCart} disabled={!selectedProduct}
              className={`mb-[1px] px-4 py-3 rounded-xl font-bold shadow-lg transition ${selectedProduct ? 'bg-[#0ceded] text-black hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700'}`}>
              Add
            </button>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 mb-6 max-h-48 overflow-y-auto">
          <div className="p-3 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between text-xs font-bold uppercase text-gray-500 tracking-wider sticky top-0">
            <span>Item Details</span><span>Total</span>
          </div>
          {cart.length===0
            ? <div className="p-8 text-center flex flex-col items-center text-gray-400"><span className="text-2xl mb-2">🛒</span><p className="text-sm">No items added yet.</p></div>
            : <table className="w-full text-sm text-left"><tbody>
                {cart.map((item,i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-white dark:hover:bg-slate-800">
                    <td className="p-3">
                      <div className="font-bold dark:text-white">{item.productName}</div>
                      <div className="text-xs text-gray-500">Qty: {Number(item.quantity)} × ₹{Number(item.price).toFixed(2)}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-bold dark:text-white">₹{Number(item.total).toFixed(2)}</div>
                      <button onClick={() => setCart(c=>c.filter((_,j)=>j!==i))} className="text-[10px] text-red-500 hover:underline mt-1">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <input placeholder="Customer Name" value={customerName} onChange={e=>setCustName(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20"/>
            <input placeholder="Customer GST (Optional)" value={customerGst} onChange={e=>setCustGst(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20"/>
          </div>
          <div className="space-y-3">
            <input placeholder="Phone Number" value={customerPhone} onChange={e=>setCustPhone(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20"/>
            <input placeholder="Address (Optional)" value={address} onChange={e=>setAddress(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20"/>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-800 pt-6">
          <div>
            <span className="text-xs text-gray-500 uppercase font-bold">Total Payable</span>
            <div className="text-3xl font-black text-gray-900 dark:text-white">₹ {Number(total).toFixed(2)}</div>
          </div>
          <button onClick={handleGenerate}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-green-500/30 transition">
            Generate Invoice
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};