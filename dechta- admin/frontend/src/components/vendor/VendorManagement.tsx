import { useState } from "react";
import { Loader2, User, Mail, Phone, Building2, MapPin, Tag, Package, Wallet, ArrowLeft, ChevronRight, Eye, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { exportToCsv } from "@/utils/exportCsv";
import type { CatalogItem, PendingVendor, PendingProduct } from "@/types";

interface VendorManagementProps {
    vendors: PendingVendor[] | undefined;
    vendorsLoading: boolean;
    catalog: CatalogItem[] | undefined;
    catalogLoading: boolean;
    products: PendingProduct[] | undefined;
    productsLoading: boolean;
    vendorFilter?: 'all' | 'active' | 'offline';
    onFilterChange?: (filter: 'all' | 'active' | 'offline') => void;
}

export default function VendorManagement({ vendors, vendorsLoading, catalog, catalogLoading, products, productsLoading, vendorFilter = 'all', onFilterChange }: VendorManagementProps) {
    const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
    const [detailVendor, setDetailVendor] = useState<PendingVendor | null>(null);
    const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const vendorList = (vendors ?? []).filter((vendor) => {
        if (vendorFilter === 'active') return vendor.verificationStatus === 'verified';
        if (vendorFilter === 'offline') return vendor.verificationStatus !== 'verified';
        return true;
    });

    // Products for selected vendor, sorted A-Z by name, with status filter
    const vendorProducts = (products ?? [])
        .filter(p => selectedVendor && p.vendorId === selectedVendor.id)
        .filter(p => productStatusFilter === 'all' || p.approvalStatus === productStatusFilter)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Vendor Management</h2>

                {/* ── VENDOR PRODUCTS VIEW ─────────────────── */}
                {selectedVendor ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Back button + vendor name header */}
                        <div className="flex items-center gap-3 mb-4">
                            <Button
                                onClick={() => { setSelectedVendor(null); setProductStatusFilter('all'); }}
                                variant="ghost"
                                className="rounded-full w-9 h-9 p-0 bg-gray-100 hover:bg-gray-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedVendor.name}</h3>
                                <div className="text-sm text-gray-500">
                                    {selectedVendor.email} · {selectedVendor.phone || 'No phone'}
                                    <span className="ml-2">
                                        <StatusBadge
                                            label={selectedVendor.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                                            colorClass={selectedVendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status filter pills */}
                        <div className="flex gap-2">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                                <Button
                                    key={status}
                                    onClick={() => setProductStatusFilter(status)}
                                    variant="ghost"
                                    className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${productStatusFilter === status ? 'bg-black text-cyan-400 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {status}
                                </Button>
                            ))}
                            <div className="ml-auto text-sm font-semibold text-gray-500 flex items-center px-3">
                                {vendorProducts.length} product{vendorProducts.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Products table */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <Table className="w-full text-sm">
                                <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <TableRow>
                                        <TableHead className="px-4 py-2 text-left font-semibold">SI</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">IMAGE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">PRODUCT NAME / DESC</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">HSN CODE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">UNIT PRICE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">SELLING PRICE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">GST(%)</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">STOCK</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">STATUS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100">
                                    {productsLoading ? (
                                        <TableRow><TableCell colSpan={9} className="px-4 py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                    ) : vendorProducts.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} className="px-4 py-6 text-center text-gray-500 italic">No products found for this vendor</TableCell></TableRow>
                                    ) : (
                                        vendorProducts.map((product, index) => (
                                            <TableRow key={product.id} className="hover:bg-cyan-50/30 transition-colors">
                                                <TableCell className="px-4 py-3 font-medium text-gray-900">{index + 1}</TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0 overflow-hidden">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            'No img'
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[150px]" title={product.description}>{product.description}</div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-600">{product.hsnCode || 'N/A'}</TableCell>
                                                <TableCell className="px-4 py-3 text-gray-900 font-medium">₹{product.price}</TableCell>
                                                <TableCell className="px-4 py-3 text-gray-900 font-medium">₹{product.sellingPrice || '0'}</TableCell>
                                                <TableCell className="px-4 py-3 text-gray-600">{product.gst || '0'}%</TableCell>
                                                <TableCell className="px-4 py-3 text-gray-600">{product.stock || 0}</TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <StatusBadge
                                                        label={product.approvalStatus}
                                                        colorClass={
                                                            product.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                                            product.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    /* ── VENDORS LIST VIEW ──────────────────── */
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-500">Click on a vendor to view their products</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => exportToCsv(vendorList, [
                                        { key: 'name', header: 'Business Name' },
                                        { key: 'email', header: 'Email' },
                                        { key: 'phone', header: 'Phone' },
                                        { key: 'businessType', header: 'Business Type' },
                                        { key: 'verificationStatus', header: 'Status' },
                                        { key: 'totalProducts', header: 'Total Products' },
                                        { key: 'walletDue', header: 'Wallet Due' },
                                    ], 'vendors_export')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {(['all', 'active', 'offline'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => onFilterChange?.(f)}
                                            className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${vendorFilter === f ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-sm font-semibold text-gray-600 px-4 py-2 bg-gray-100 rounded-lg">{vendorList.length} Vendors</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <Table className="w-full text-sm">
                                <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <TableRow>
                                        <TableHead className="px-4 py-2 text-left font-semibold">BUSINESS NAME / SHOP NAME</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">CONTACT</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">TOTAL PRODUCTS</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">WALLET DUE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">BUSINESS TYPE</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold">STATUS</TableHead>
                                        <TableHead className="px-4 py-2 text-left font-semibold w-20">ACTIONS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100">
                                    {vendorsLoading ? (
                                        <TableRow><TableCell colSpan={7} className="px-4 py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                                    ) : vendorList.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="px-4 py-6 text-center text-gray-500 italic">No vendors found</TableCell></TableRow>
                                    ) : (
                                        vendorList.map((vendor) => (
                                            <TableRow
                                                key={vendor.id}
                                                className="hover:bg-cyan-50/30 transition-colors cursor-pointer group"
                                                onClick={() => setSelectedVendor(vendor)}
                                            >
                                                <TableCell className="px-4 py-3">
                                                    <div className="font-medium text-cyan-700 group-hover:underline">{vendor.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">VND{vendor.id.toString().padStart(3, '0')}</div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-600">
                                                    <div className="text-xs">{vendor.email}</div>
                                                    <div className="text-xs text-gray-500">{vendor.phone || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="font-medium text-gray-700">{vendor.totalProducts ?? 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Wallet className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="font-medium text-gray-700">₹{vendor.walletDue || '0'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-600">{vendor.businessType || 'N/A'}</TableCell>
                                                <TableCell className="px-4 py-3">
                                                    {vendor.verificationStatus !== 'verified' ? (
                                                        <StatusBadge label="Pending" colorClass="bg-yellow-100 text-yellow-700" />
                                                    ) : (
                                                        <StatusBadge label="Online" colorClass="bg-green-100 text-green-700" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailVendor(vendor); }}
                                                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-cyan-100 flex items-center justify-center transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-600" />
                                                        </button>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-500 transition-colors" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* Vendor Detail Modal */}
            <Dialog open={!!detailVendor} onOpenChange={(open) => !open && setDetailVendor(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Vendor Details</DialogTitle>
                    </DialogHeader>
                    {detailVendor && (
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center gap-3 pb-4 border-b">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <User className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="font-semibold text-lg text-gray-900">{detailVendor.name}</div>
                                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-mono border border-gray-200">
                                            VND{detailVendor.id.toString().padStart(3, '0')}
                                        </span>
                                    </div>
                                    <StatusBadge
                                        label={detailVendor.verificationStatus}
                                        colorClass={
                                            detailVendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' :
                                            detailVendor.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Email:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Phone:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Owner / Contact:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.ownerName || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Business Type:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.businessType || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Business Address:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.businessAddress || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Warehouse Address:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.warehouseAddress || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Experience:</span>
                                    <span className="font-medium text-gray-900">{detailVendor.yearsOfBusinessExperience || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="pt-3 border-t">
                                <Button
                                    onClick={() => { setSelectedVendor(detailVendor); setDetailVendor(null); }}
                                    className="w-full bg-black text-cyan-400 hover:bg-gray-900"
                                >
                                    <Package className="w-4 h-4 mr-2" /> View Products
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
