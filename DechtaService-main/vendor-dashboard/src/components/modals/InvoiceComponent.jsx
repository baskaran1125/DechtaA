import ReactDOM from 'react-dom';
import { numberToWords } from '../../utils/helpers';

// ── Format any date value into DD/MM/YYYY ─────────────────────
const formatDate = (raw) => {
  if (!raw) return new Date().toLocaleDateString('en-IN');
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? String(raw)                              // already a display string, use as-is
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const InvoiceComponent = ({ order, vendor, products, onClose }) => {
  const product = products.find(p => p.name === order.productName) || {};
  const baseHsn     = product.hsn || '8205';
  const baseGstPct  = product.gstPercent ?? order.gstPercent ?? 18;

  let itemsList = [];
  if (order.items) {
    try {
      const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : Array.isArray(order.items) ? order.items : [];
      // Ensure each item has proper structure
      itemsList = parsed.map(item => ({
        ...item,
        productName: item.productName || item.name || item.product_name || 'Item',
        price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || item.qty || item.quantity || 1),
        total: Number(item.total || item.amount || (Number(item.price || item.unit_price || 0) * Number(item.quantity || item.qty || 1)))
      }));
    } catch (e) {
      itemsList = [];
    }
  }
  
  // If no items found, try to construct from order details
  if (!itemsList || itemsList.length === 0) {
    const qty = order.quantity || order.qty || 1;
    const totalAmt = Number(order.totalAmount || order.total_amount || order.final_amount || order.price || 0);
    const price = qty > 0 ? totalAmt / qty : 0;
    
    itemsList = [{
      productName: order.productName || order.name || 'Order Item',
      name: order.productName || order.name || 'Order Item',
      hsn: '8205',
      price: price,
      qty: qty,
      quantity: qty,
      gst: order.gstPercent || 18,
      total: totalAmt
    }];
  }

  // Calculate grand total properly
  let grandTotal = Number(order.totalAmount || order.total_amount || 0);
  
  // If still 0, calculate from items
  if (grandTotal === 0 && itemsList && itemsList.length > 0) {
    grandTotal = itemsList.reduce((sum, item) => {
      const itemTotal = Number(item.total || (Number(item.price || 0) * Number(item.quantity || item.qty || 0)));
      return sum + itemTotal;
    }, 0);
  }
  
  // If still 0 but we have order total_amount, use that
  if (grandTotal === 0 && order.final_amount) {
    grandTotal = Number(order.final_amount);
  }

  // ── Dates ─────────────────────────────────────────────────────
  const orderDate   = formatDate(order.date || order.createdAt || order.orderDate);
  const invoiceDate = formatDate(order.invoiceDate || order.date || order.createdAt);

  const rawPan = vendor.gst ? vendor.gst.substring(2, 12) : 'XXXXXXXXXX';
  const masked = rawPan.substring(0, 5) + '****' + rawPan.substring(9, 10);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[800px] rounded-lg shadow-2xl flex flex-col relative my-auto">

        {/* ── Top bar ── */}
        <div className="sticky top-0 bg-slate-800 text-white p-3 flex justify-between items-center z-50 rounded-t-lg no-print">
          <span className="font-bold text-sm">Invoice Preview</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-[#0ceded] text-black px-4 py-1.5 rounded font-bold hover:opacity-90 text-xs">Print Invoice</button>
            <button onClick={onClose} className="bg-slate-600 px-4 py-1.5 rounded font-bold hover:bg-slate-500 text-xs text-white">Close</button>
          </div>
        </div>

        <div id="invoice-print-area" className="p-10 bg-white text-black font-sans text-[11px] leading-snug">

          {/* ── Header ── */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black italic">DECHTA</span>
              <span className="text-2xl text-[#0ceded] font-black italic">HUB</span>
            </div>
            <div className="text-right">
              <h1 className="font-bold text-base uppercase">Tax Invoice</h1>
              <p className="text-[10px] text-gray-600">Original for Recipient</p>
            </div>
          </div>

          {/* ── Seller / Buyer ── */}
          <div className="flex justify-between mb-8 gap-10">
            <div className="flex-1">
              <div className="font-bold text-gray-500 uppercase text-[10px] mb-1">Sold By</div>
              <div className="uppercase font-bold text-sm mb-1">{vendor.shopName}</div>
              <div className="text-gray-700">{vendor.location}, {vendor.area}<br />India</div>
              <div className="mt-3 space-y-0.5">
                <div className="font-bold">PAN No: <span className="font-mono font-normal uppercase">{masked}</span></div>
                <div className="font-bold">GSTIN: <span className="font-mono font-normal uppercase">{vendor.gst || 'NA'}</span></div>
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="font-bold text-gray-500 uppercase text-[10px] mb-1">Billing Address</div>
              <div className="font-bold text-sm mb-1">{order.customerName || 'Walk-in Customer'}</div>
              <div className="text-gray-700">
                {order.customerPhone ? `Ph: ${order.customerPhone}` : ''}<br />
                {vendor.location}, India
              </div>
            </div>
          </div>

          {/* ── Order meta ── */}
          <div className="grid grid-cols-2 bg-gray-50 p-3 rounded mb-6 border border-gray-200">
            <div>
              <div className="font-bold">Order ID: <span className="font-mono font-normal">#{String(order.id).slice(-8)}</span></div>
              <div className="font-bold">Order Date: <span className="font-normal">{orderDate}</span></div>
            </div>
            <div className="text-right">
              <div className="font-bold">Invoice No: <span className="font-mono font-normal text-blue-600">QC-{String(order.id).slice(-6)}</span></div>
              <div className="font-bold">Invoice Date: <span className="font-normal">{invoiceDate}</span></div>
            </div>
          </div>

          {/* ── Line items table ── */}
          <table className="w-full mb-6 text-left border border-gray-300">
            <thead>
              <tr className="bg-slate-100 text-gray-700 border-b border-gray-300">
                <th className="p-2 border-r border-gray-300 w-10 text-center">#</th>
                <th className="p-2 border-r border-gray-300">Item Description</th>
                <th className="p-2 border-r border-gray-300 text-right">Unit Price</th>
                <th className="p-2 border-r border-gray-300 text-center">Qty</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item, idx) => (
                <tr key={idx} className="h-16">
                  <td className="p-2 border-r border-gray-300 text-center align-top">{idx + 1}</td>
                  <td className="p-2 border-r border-gray-300 align-top">
                    <div className="font-bold text-sm mb-1">{item.productName}</div>
                    <div className="text-[10px] text-gray-500">
                      HSN: {item.hsn || baseHsn} &nbsp;|&nbsp; GST {item.gst || baseGstPct}% incl. in price
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-300 text-right align-top">₹{Number(item.price || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-gray-300 text-center align-top">{Number(item.quantity || item.qty || 0)}</td>
                  <td className="p-2 text-right align-top font-bold">₹{Number(item.total || (Number(item.price || 0) * Number(item.quantity || item.qty || 0))).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 bg-gray-50">
                <td colSpan="4" className="p-2 text-right border-r border-gray-300 uppercase text-[10px] font-bold">
                  Subtotal (incl. GST)
                </td>
                <td className="p-2 text-right font-bold">₹{grandTotal.toFixed(2)}</td>
              </tr>
              <tr className="border-t-2 border-black bg-slate-900 text-white font-bold text-sm">
                <td colSpan="4" className="p-3 text-right border-r border-slate-700 uppercase">Grand Total</td>
                <td className="p-3 text-right text-[#0ceded]">₹{grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* ── Amount in words ── */}
          <div className="mb-10">
            <div className="text-[10px] font-bold text-gray-500 mb-1">Amount in Words:</div>
            <div className="font-bold text-xs uppercase">{numberToWords(Math.floor(grandTotal))}</div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-between items-end">
            <div className="text-[9px] text-gray-400 w-2/3">
              * Computer generated invoice. Goods once sold subject to terms of service.
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold mb-10">Authorized Signatory for {vendor.shopName}</div>
              <div className="border-t border-black w-40 pt-1" />
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceComponent;