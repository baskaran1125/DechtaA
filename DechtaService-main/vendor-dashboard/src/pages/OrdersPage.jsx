import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Icons } from '../components/ui/Icons';
import InvoiceComponent from '../components/modals/InvoiceComponent';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseImages = (images) => {
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const getOrderProductName = (order) => {
  const direct =
    order?.productName ||
    order?.product_name ||
    order?.name ||
    order?.product ||
    order?.item_name;
  if (direct && String(direct).trim()) return String(direct).trim();

  const items = parseJsonArray(order?.items);
  const firstItem = items[0] || {};
  const itemName = firstItem?.productName || firstItem?.product_name || firstItem?.name || firstItem?.title;
  if (itemName && String(itemName).trim()) return String(itemName).trim();

  const orderDetails = parseJsonObject(order?.order_details);
  const detailsItems = parseJsonArray(orderDetails?.items);
  const firstDetailsItem = detailsItems[0] || {};
  const detailsName =
    firstDetailsItem?.productName ||
    firstDetailsItem?.product_name ||
    firstDetailsItem?.name ||
    firstDetailsItem?.title;
  if (detailsName && String(detailsName).trim()) return String(detailsName).trim();

  return 'Order Item';
};


const resolveOrderImage = (order, products = []) => {
  const direct =
    order?.productImage ||
    order?.product_image ||
    order?.imageUrl ||
    order?.image_url ||
    order?.thumbnail;
  if (direct) return direct;

  const orderImages = parseImages(order?.images);
  if (orderImages[0]) return orderImages[0];

  const productById = products.find((p) =>
    String(p?.id ?? '') === String(order?.productId ?? order?.product_id ?? '')
  );
  const productByName = products.find((p) => {
    const left = String(p?.name || p?.product_name || '').trim().toLowerCase();
    const right = String(order?.productName || order?.product_name || '').trim().toLowerCase();
    return left && right && left === right;
  });
  const product = productById || productByName;
  if (!product) return null;

  const productImages = parseImages(product.images);
  return productImages[0] || product.image_url || product.imageUrl || null;
};

const normalizeOrderStatus = (order) => {
  const raw = String(order?.normalized_status || order?.normalizedStatus || order?.status || '').trim().toLowerCase();
  if (!raw) return 'pending';
  if (['pending', 'placed'].includes(raw)) return 'pending';
  if (['confirmed', 'processing', 'packed'].includes(raw)) return 'confirmed';
  if (['assigned', 'accepted'].includes(raw)) return 'assigned';
  if (['picked_up', 'arrived_pickup', 'out for delivery', 'arrived_dropoff', 'shipped', 'dispatched', 'in_transit', 'live'].includes(raw)) return 'in_transit';
  if (['delivered', 'completed', 'done'].includes(raw)) return 'delivered';
  if (['cancelled', 'canceled', 'missed', 'returned'].includes(raw)) return 'cancelled';
  return raw;
};

const toFilterStage = (normalizedStatus) => {
  if (normalizedStatus === 'delivered') return 'Completed';
  if (['in_transit', 'assigned', 'confirmed'].includes(normalizedStatus)) return 'Live';
  return 'Pending';
};

const OrderJourneyAnimation = ({ stage }) => {
  const pos   = stage==='Live' ? '50%' : stage==='Completed' ? '90%' : '10%';
  const label = stage==='Live' ? 'On the way!' : stage==='Completed' ? 'Delivered!' : 'Waiting...';
  const anim  = stage==='Live' ? 'animate-truck-bounce' : '';
  return (
    <div className="w-full h-32 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden mb-6 flex items-center px-8">
      <div className="absolute w-full h-1 bg-gray-200 dark:bg-slate-700 top-2/3 left-0" />
      {[{p:'10%',l:'Pending'},{p:'50%',l:'Live'},{p:'90%',l:'Done'}].map(m=>(
        <div key={m.l} className="absolute top-2/3 -translate-y-1 text-center" style={{left:m.p}}>
          <div className="w-3 h-3 bg-gray-400 rounded-full -translate-x-1.5" />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-bold uppercase">{m.l}</span>
        </div>
      ))}
      <div className="absolute top-1/2 transition-all duration-1000 ease-in-out z-10 flex flex-col items-center" style={{left:pos, transform:'translate(-50%, -20%)'}}>
        <div className="mb-2 bg-[#0ceded] text-black text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm whitespace-nowrap">{label}</div>
        <div className={`text-blue-600 dark:text-blue-400 ${anim}`}>
          <svg viewBox="0 0 100 60" className="w-16 h-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="25" cy="52" r="7" /><circle cx="40" cy="52" r="7" /><circle cx="80" cy="52" r="7" />
            <rect x="5" y="15" width="50" height="30" rx="2" /><path d="M55 45 L90 45 L90 25 L75 15 L55 15"/>
            <path d="M75 15 L75 45" />
          </svg>
        </div>
        {stage==='Live' && <div className="absolute bottom-0 -left-4 text-lg text-gray-400 dust-cloud">💨</div>}
      </div>
    </div>
  );
};

const OrdersPage = ({ orders=[], onUpdateStatus, notify, products, vendor }) => {
  const [filter, setFilter]   = useState('Pending');
  const [viewInvoice, setInvoice] = useState(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState({});
  const withStatus = orders.map((o) => {
    const normalized = normalizeOrderStatus(o);
    return {
      ...o,
      productName: getOrderProductName(o),
      quantity: toNumber(o.quantity ?? o.qty ?? 0),
      totalAmount: toNumber(o.totalAmount ?? o.total_amount ?? o.final_total ?? o.amount),
      date: o.date || o.orderDate || o.order_date || o.created_at || '-',
      deliveryAddress: o.deliveryAddress || o.delivery_address || '',
      customerName: o.customerName || o.customer_name || o.clientName || o.client_name || '',
      customerPhone: o.customerPhone || o.customer_phone || o.clientPhone || o.client_phone || '',
      productImage: resolveOrderImage(o, products),
      normalizedStatus: normalized,
      uiStatus: toFilterStage(normalized),
    };
  });
  const filtered  = withStatus.filter(o => o.uiStatus === filter);
  const recent    = [...withStatus].sort((a,b)=>String(b.id).localeCompare(String(a.id))).slice(0,5);
  const getActionConfig = (order) => {
    if (order?.uiStatus === 'Pending') {
      const vendorAccepted = ['accepted', 'accept'].includes(String(order?.v_status || '').trim().toLowerCase());
      if (vendorAccepted) {
        return { label: 'Accepted', nextStatus: null, disabled: true };
      }
      return { label: 'Accept', nextStatus: 'accepted', disabled: false };
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h2>
        <button onClick={() => notify('Downloading CSV...','info')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition">⬇ Export CSV</button>
      </div>
      <OrderJourneyAnimation stage={filter} />
      <div className="flex justify-center md:justify-start">
        <div className="bg-gray-100 dark:bg-slate-900 rounded-full px-2 py-2 flex items-center gap-1 w-full md:w-auto overflow-x-auto">
          {['Pending','Live','Completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-full transition-all duration-300 ${filter===s ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {filtered.length===0
          ? <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800"><p className="text-gray-500">No {filter.toLowerCase()} orders.</p></div>
          : filtered.map(o => (
            <Card key={o.id} className="group hover:border-[#0ceded]/50 soft-hover">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden text-gray-500">
                    {o.productImage
                      ? <img src={o.productImage} alt={o.productName} className="w-full h-full object-cover" />
                      : <Icons.Package />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{o.productName}</h3>
                      {o.type==='Offline' && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase">Offline</span>}
                      {o.type==='Online' && <span className="text-[9px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-bold uppercase">Online</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Qty: <span className="font-bold text-gray-900 dark:text-white">{o.quantity}</span> • {o.date}</div>
                    {(o.customerName || o.clientName) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Customer: <span className="font-semibold text-gray-700 dark:text-gray-300">{o.customerName || o.clientName}</span>
                        {(o.customerPhone || o.clientPhone) && <span> • {o.customerPhone || o.clientPhone}</span>}
                      </div>
                    )}
                    {o.deliveryAddress && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">📍 {o.deliveryAddress}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xl font-bold text-[#0ceded]">₹ {Number(o.totalAmount).toLocaleString()}</div>
                  {getActionConfig(o) && (
                    <button
                      onClick={async () => {
                        const action = getActionConfig(o);
                        if (!action || action.disabled || !action.nextStatus) return;
                        setUpdatingOrderIds((prev) => ({ ...prev, [o.id]: true }));
                        const updatedOrder = await onUpdateStatus(o.id, action.nextStatus);
                        setUpdatingOrderIds((prev) => {
                          const next = { ...prev };
                          delete next[o.id];
                          return next;
                        });
                        if (!updatedOrder) return;
                        notify(`Order updated: ${action.label}`, 'success');
                      }}
                      disabled={Boolean(updatingOrderIds[o.id]) || Boolean(getActionConfig(o)?.disabled)}
                      className={`px-5 py-2 rounded-lg text-[11px] font-bold shadow-lg ${getActionConfig(o)?.disabled ? 'bg-gray-400 text-white cursor-not-allowed shadow-gray-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'} ${updatingOrderIds[o.id] ? 'opacity-80 cursor-wait' : ''}`}
                    >
                      {updatingOrderIds[o.id] ? 'Updating...' : getActionConfig(o)?.label}
                    </button>
                  )}
                  {(o.uiStatus==='Live'||o.uiStatus==='Completed') && (
                    <button onClick={() => setInvoice(o)} className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Icons.Receipt /> Invoice</button>
                  )}
                </div>
              </div>
            </Card>
          ))}
      </div>
      <hr className="border-gray-100 dark:border-slate-800 my-8" />
      <div className="pb-10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-[#0ceded] rounded-full" /> Recent Activity Log</h3>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 uppercase text-[10px] font-bold">
              <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">Product</th><th className="px-6 py-3 text-right">Amount</th><th className="px-6 py-3 text-center">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {recent.length===0
                ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">No recent activity.</td></tr>
                : recent.map(o => {
                  const normalized = normalizeOrderStatus(o);
                  const uiStatus = toFilterStage(normalized);
                  return (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-3 font-mono text-[10px] text-gray-400">#{String(o.id).slice(-8)}</td>
                    <td className="px-6 py-3 font-semibold dark:text-gray-200">{o.productName}</td>
                    <td className="px-6 py-3 text-right font-bold text-[#0ceded]">₹{Number(o.totalAmount).toLocaleString()}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${uiStatus==='Completed'?'bg-green-100 text-green-700':uiStatus==='Live'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{uiStatus}</span>
                    </td>
                  </tr>
                )})}
            </tbody>
          </table>
        </Card>
      </div>
      {viewInvoice && <InvoiceComponent order={viewInvoice} vendor={vendor} products={products} onClose={() => setInvoice(null)} />}
    </div>
  );
};
export default OrdersPage;
