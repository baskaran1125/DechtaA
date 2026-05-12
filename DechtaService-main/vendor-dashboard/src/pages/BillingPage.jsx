import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Icons } from '../components/ui/Icons';
import InvoiceComponent from '../components/modals/InvoiceComponent';
import { OfflineBillModal } from '../components/modals/OfflineBillModal';

const normalizeOrderStatus = (order) => {
  const vendorStatus = String(order?.v_status || '').trim().toLowerCase();
  if (vendorStatus === 'accept') return 'assigned';

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

const BillingPage = ({ orders = [], invoices = [], products, vendor, onGenerateOfflineBill }) => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOffline, setShowOffline]         = useState(false);
  
  // Helper function to safely get invoice amount with proper formatting
  const getAmount = (item) => {
    const amount = item?.total_amount || item?.totalAmount || item?.price || item?.order_amount || 0;
    return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  
  const billable = [
    ...orders.filter(o => normalizeOrderStatus(o) !== 'pending'), 
    ...invoices
  ].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

  return (
    <div className="p-6 space-y-6 fade-in">
      {showOffline && <OfflineBillModal products={products} onClose={() => setShowOffline(false)} onGenerate={onGenerateOfflineBill} />}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices & Billing</h2>
        <button onClick={() => setShowOffline(true)} className="bg-[#0ceded] text-black px-4 py-2 rounded-lg font-bold text-sm shadow hover:opacity-90 transition flex items-center gap-2">
          <Icons.Plus /> New Offline Bill
        </button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-4">Invoice ID</th><th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Type</th><th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {billable.length===0
              ? <tr><td colSpan="6" className="p-10 text-center text-gray-500"><div className="flex flex-col items-center gap-2"><span className="text-3xl">📄</span><p>No invoices generated yet.</p></div></td></tr>
              : billable.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4 font-mono text-xs">{o.invoice_number || `INV-${String(o.id).slice(-6)}`}</td>
                  <td className="px-6 py-4">{o.date || new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4"><span className={`text-[9px] font-bold px-2 py-1 rounded uppercase ${(o.type==='Offline' || false)?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{o.type || (o.invoice_number ? 'Offline' : 'Online')}</span></td>
                  <td className="px-6 py-4 font-medium">{o.customerName || o.customer_name || 'Standard Customer'}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#0ceded]">{getAmount(o)}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setSelectedInvoice(o)} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-gray-50 transition">View Invoice</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
      {selectedInvoice && <InvoiceComponent order={selectedInvoice} vendor={vendor} products={products} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
};
export default BillingPage;
