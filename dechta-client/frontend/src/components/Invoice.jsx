import React from 'react';

/**
 * Amazon-style Tax Invoice Component
 * Optimized for @media print
 */
export default function Invoice({ booking, userData }) {
    if (!booking) return null;

    const selectedAddress = userData?.addresses?.find(a => a.selected) || userData?.addresses?.[0] || { text: 'N/A', tag: 'Default' };
    
    // Tax Calculation Logic (Estimating 18% GST for the demo)
    const calculateTax = (itemTotal) => {
        const taxableAmount = itemTotal / 1.18;
        const totalTax = itemTotal - taxableAmount;
        return {
            taxableAmount: taxableAmount.toFixed(2),
            cgst: (totalTax / 2).toFixed(2),
            sgst: (totalTax / 2).toFixed(2),
            totalTax: totalTax.toFixed(2)
        };
    };

    const companyDetails = {
        name: "Dechta Technologies Pvt Ltd",
        address: "No. 45, Brick-work Layout, Anna Nagar West, Chennai, Tamil Nadu - 600040",
        gst: "33AAAAA0000A1Z5",
        pancard: "ABCDE1234F"
    };

    return (
        <div className="invoice-container bg-white text-black p-8 max-w-[800px] mx-auto font-sans leading-tight print:p-0 print:m-0 print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-950 pb-6 mb-6">
                <div className="flex flex-col gap-1">
                    <img src="/Dechta.png" className="h-14 w-auto object-contain mb-3" alt="Dechta Logo" />
                    <h1 className="text-2xl font-black text-gray-900 leading-none">Tax Invoice/Bill of Supply</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">(Original for Recipient)</p>
                </div>
                <div className="text-right flex flex-col gap-1">
                    <h2 className="text-xl font-black text-gray-950 uppercase tracking-tighter mb-1">DECHTA</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400">Invoice Details</p>
                    <p className="text-sm font-black">#QC-INV-{booking.id}-{new Date().getFullYear()}</p>
                    <p className="text-xs text-gray-600">Order ID: #QC{booking.id}</p>
                    <p className="text-xs text-gray-600">Date: {booking.date}</p>
                </div>
            </div>

            {/* Address Grid */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3 border-b-2 border-gray-100 pb-1">Sold By:</h3>
                    <p className="text-sm font-black text-gray-950 uppercase leading-tight">{companyDetails.name}</p>
                    <p className="text-[11px] text-gray-600 mt-2 whitespace-pre-line leading-relaxed max-w-[280px]">
                        {companyDetails.address}
                    </p>
                    <div className="mt-4 space-y-1">
                        <p className="text-[10px] uppercase font-bold text-gray-500">GST Registration No: <span className="text-gray-950 font-black">{companyDetails.gst}</span></p>
                        <p className="text-[10px] uppercase font-bold text-gray-500">PAN: <span className="text-gray-950 font-black">{companyDetails.pancard}</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3 border-b-2 border-gray-100 pb-1 text-right">Billing Address:</h3>
                    <p className="text-sm font-black text-gray-950 uppercase leading-tight">{userData?.name || 'Valued Customer'}</p>
                    <p className="text-[11px] text-gray-600 mt-2 whitespace-pre-line leading-relaxed">
                        {selectedAddress.text}
                    </p>
                    {booking.gst && (
                        <div className="mt-4 p-2 bg-gray-50 rounded border border-gray-100 text-right">
                            <p className="text-[9px] uppercase font-black text-gray-400">Business GST Details</p>
                            <p className="text-xs font-black text-gray-900">{booking.gst.businessName}</p>
                            <p className="text-xs font-bold text-cyan-600">{booking.gst.gstin}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Item Table */}
            <table className="w-full text-xs mb-10 border-collapse border border-gray-200">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="py-3 px-3 text-left font-black uppercase tracking-tighter border-r border-gray-200 w-12">S.No</th>
                        <th className="py-3 px-3 text-left font-black uppercase tracking-tighter border-r border-gray-200">Description</th>
                        <th className="py-3 px-3 text-right font-black uppercase tracking-tighter border-r border-gray-200">Unit Price</th>
                        <th className="py-3 px-3 text-center font-black uppercase tracking-tighter border-r border-gray-200 w-12">Qty</th>
                        <th className="py-3 px-3 text-right font-black uppercase tracking-tighter border-r border-gray-200">Net Amount</th>
                        <th className="py-3 px-3 text-right font-black uppercase tracking-tighter border-r border-gray-200">Tax Breakdown</th>
                        <th className="py-3 px-3 text-right font-black uppercase tracking-tighter">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {booking.items?.map((item, idx) => {
                        const tax = calculateTax(item.price * item.qty);
                        return (
                            <tr key={idx}>
                                <td className="py-4 px-3 text-gray-500 border-r border-gray-200 text-center font-bold">{idx + 1}</td>
                                <td className="py-4 px-3 border-r border-gray-200">
                                    <p className="font-black text-gray-950 text-sm leading-tight">{item.name}</p>
                                    <p className="text-[9px] text-gray-400 uppercase mt-1 font-bold">HSN/SAC: 8467.21 | VAT Code: EX</p>
                                </td>
                                <td className="py-4 px-3 text-right border-r border-gray-200 font-medium">₹{item.price.toLocaleString('en-IN')}</td>
                                <td className="py-4 px-3 text-center border-r border-gray-200 font-black">{item.qty}</td>
                                <td className="py-4 px-3 text-right border-r border-gray-200 font-medium">₹{tax.taxableAmount}</td>
                                <td className="py-4 px-3 text-right border-r border-gray-200 text-[9px] leading-tight text-gray-500">
                                    CGST (9%): ₹{tax.cgst}<br/>SGST (9%): ₹{tax.sgst}
                                </td>
                                <td className="py-4 px-3 text-right font-black text-sm bg-gray-50/50">₹{(item.price * item.qty).toLocaleString('en-IN')}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-950 bg-gray-50">
                        <td colSpan="6" className="py-5 px-4 text-right font-black uppercase text-sm tracking-tight border-r border-gray-200">Grand Total:</td>
                        <td className="py-5 px-4 text-right font-black text-lg text-gray-950">₹{booking.total?.toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Summary Footer */}
            <div className="grid grid-cols-2 gap-12 items-end">
                <div>
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2">Amount in Words:</h3>
                        <p className="text-xs font-black italic text-gray-800 leading-tight bg-gray-50 p-2 rounded border border-gray-100">
                            Indian Rupees {booking.total?.toLocaleString('en-IN')} Only
                        </p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-[10px] text-gray-500 leading-relaxed shadow-sm">
                        <p className="font-black uppercase mb-1.5 text-gray-900 border-b border-gray-200 pb-1">Declaration:</p>
                        We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct. This is a computer generated invoice and does not require a physical signature for validity.
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-6 border-b border-gray-100 pb-1 w-full text-right">For {companyDetails.name}:</p>
                    <div className="relative w-40 h-20 mb-3 overflow-hidden border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-center">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        <p className="text-[12px] font-black text-gray-300 uppercase rotate-[-15deg] scale-150 select-none">AUTHORIZED SIGNATORY</p>
                        <img src="/Dechta.png" className="w-20 h-auto grayscale opacity-40 absolute" alt="Sign Watermark" />
                    </div>
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{companyDetails.name}</p>
                </div>
            </div>

            <div className="mt-16 text-center border-t border-gray-100 pt-8 space-y-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Thank you for choosing Dechta</p>
                <p className="text-[9px] text-gray-400 font-medium">
                    In case of return, please ensure tokens are attached. Visit dechta.com/returns for more info.
                    Registered Office: {companyDetails.address}
                </p>
            </div>
        </div>
    );
}
