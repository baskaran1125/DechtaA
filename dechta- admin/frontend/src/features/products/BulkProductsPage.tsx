import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Loader2, Plus, X, Truck, Scale, Ruler, ChevronDown, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import type { CatalogItem } from "@/types";

// ── Constants ──────────────────────────────────────────────
const CATEGORY_OPTIONS = [
    'Sand', 'Cement', 'Steel', 'PVC Pipe', 'Blue Metal', 'Blue Metal (Jalli)',
    'Construction', 'Flooring', 'Fittings', 'Hardware', 'Painting',
    'Interior', 'Carpentry', 'Electrical', 'Plumbing', 'Sanitary',
    'Gravel', 'Bricks', 'Paint',
];

const UNIT_OPTIONS = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ton', label: 'Tons' },
    { value: 'bag', label: 'Bags' },
    { value: 'cft', label: 'Cubic Feet (cft)' },
    { value: 'sqft', label: 'Square Feet (sqft)' },
    { value: 'meter', label: 'Meters' },
    { value: 'liter', label: 'Liters' },
    { value: 'bundle', label: 'Bundles' },
    { value: 'box', label: 'Boxes' },
    { value: 'roll', label: 'Rolls' },
    { value: 'set', label: 'Sets' },
    { value: 'load', label: 'Loads' },
    { value: 'trip', label: 'Trips' },
];

const HEAVY_CATEGORIES = ['sand', 'pvc pipe', 'steel', 'blue metal', 'blue metal (jalli)'];
const isHeavyCategory = (cat: string) => HEAVY_CATEGORIES.includes((cat || '').trim().toLowerCase());

const STOCK_QUICK = [5, 10, 20, 50, 100, 200, 500, 1000];
const DESC_MAX = 30;
const DETAIL_MAX = 200;

const countWords = (t: string) => t.trim() === '' ? 0 : t.trim().split(/\s+/).length;

// ── Vehicle prediction (simplified from ProductForm) ──────
function predictVehicle(l: number, w: number, h: number, wt: number): string {
    const vol = (l * w * h) / 1000000; // cm³ → m³
    if (wt <= 5 && vol <= 0.02) return '🏍️ Two Wheeler';
    if (wt <= 200 && vol <= 0.5) return '🛺 3-Wheeler / Tata Ace';
    if (wt <= 750) return '🚚 Mini Truck (750 kg)';
    if (wt <= 1400) return '🚛 LCV (1.4 ton)';
    if (wt <= 2500) return '🚛 Truck (2.5 ton)';
    return '🚛 Heavy Truck (2.5+ ton)';
}

// ── HSN lookup (basic mapping) ────────────────────────────
const CATEGORY_HSN: Record<string, string> = {
    sand: '2505', cement: '2523', steel: '7214', 'pvc pipe': '3917',
    'blue metal': '2517', 'blue metal (jalli)': '2517', bricks: '6901',
    paint: '3209', gravel: '2517', flooring: '6908', hardware: '8302',
    electrical: '8536', plumbing: '7412', sanitary: '6910',
};

// ── Word Counter Badge ────────────────────────────────────
function WordBadge({ count, max }: { count: number; max: number }) {
    const over = count > max;
    return (
        <span className={`text-[10px] font-bold tabular-nums ${over ? 'text-red-500' : count >= max * 0.85 ? 'text-orange-400' : 'text-gray-400'}`}>
            {count}/{max} words{over ? ' — limit exceeded' : ''}
        </span>
    );
}

// ── Category Autocomplete ─────────────────────────────────
function CategoryAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleChange = (v: string) => {
        onChange(v);
        if (v.trim()) {
            const f = CATEGORY_OPTIONS.filter(c => c.toLowerCase().startsWith(v.trim().toLowerCase()));
            setSuggestions(f);
            setOpen(f.length > 0);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
    };

    return (
        <div className="relative space-y-2">
            <Label>Category *</Label>
            <Input
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onFocus={() => {
                    if (value.trim()) {
                        const f = CATEGORY_OPTIONS.filter(c => c.toLowerCase().startsWith(value.trim().toLowerCase()));
                        if (f.length) { setSuggestions(f); setOpen(true); }
                    }
                }}
                placeholder="Start typing: Sand, Cement, Steel..."
            />
            {open && suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map((cat, i) => (
                        <div key={i} onMouseDown={() => { onChange(cat); setOpen(false); }}
                            className="px-4 py-2.5 hover:bg-cyan-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 font-medium">
                            {cat}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────
interface BulkProductsPageProps {
    catalog: CatalogItem[] | undefined;
    catalogLoading: boolean;
}

interface FormState {
    brand: string; name: string; description: string; detailedDescription: string;
    productQuality: string; warranty: string; category: string;
    mrp: string; sellingPrice: string; stock: string;
    lengthCm: string; widthCm: string; heightCm: string; weightKg: string;
    hsnCode: string; unit: string; isBulk: boolean; bulkDiscount: string;
    selfDelivery: boolean; active: boolean; imageUrl: string;
    gstPercent: string; vendorId: string;
}

const BLANK: FormState = {
    brand: '', name: '', description: '', detailedDescription: '',
    productQuality: '', warranty: '', category: '',
    mrp: '', sellingPrice: '', stock: '',
    lengthCm: '', widthCm: '', heightCm: '', weightKg: '',
    hsnCode: '', unit: 'pcs', isBulk: false, bulkDiscount: '',
    selfDelivery: false, active: true, imageUrl: '',
    gstPercent: '18', vendorId: '',
};

export default function BulkProductsPage({ catalog, catalogLoading }: BulkProductsPageProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FormState>({ ...BLANK });
    const [showStockPicker, setShowStockPicker] = useState(false);
    const [vendorOpen, setVendorOpen] = useState(false);
    const prevCatRef = useRef(form.category);

    const { data: vendors } = useQuery({
        queryKey: ['/api/ops/onboarding/vendors/all'],
        queryFn: async () => {
            const res = await fetch('/api/ops/onboarding/vendors/all', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch vendors');
            return res.json();
        }
    });

    // ── Derived ────────────────────────────────────────
    const descWords = countWords(form.description);
    const detailWords = countWords(form.detailedDescription);
    const selling = parseFloat(form.sellingPrice) || 0;
    const gst = parseFloat(form.gstPercent) || 18;
    const gstAmt = (selling * gst) / 100;
    const totalPrice = parseFloat((selling + gstAmt).toFixed(2));
    const vehicle = predictVehicle(
        parseFloat(form.lengthCm) || 0, parseFloat(form.widthCm) || 0,
        parseFloat(form.heightCm) || 0, parseFloat(form.weightKg) || 0
    );

    // ── Auto-fill HSN + name when category changes ────
    useEffect(() => {
        if (!form.category) return;
        const key = form.category.trim().toLowerCase();
        const hsn = CATEGORY_HSN[key] || '';
        setForm(f => ({ ...f, hsnCode: hsn || f.hsnCode, name: form.category }));
    }, [form.category]);

    // ── Auto self-delivery for heavy categories ───────
    useEffect(() => {
        const wasCleared = prevCatRef.current && !form.category;
        if (wasCleared) setForm(f => ({ ...f, selfDelivery: false }));
        if (isHeavyCategory(form.category) && !form.selfDelivery) {
            setForm(f => ({ ...f, selfDelivery: true }));
            toast({ title: '🚛 Self Delivery Enabled', description: 'Auto-enabled for heavy-material category.' });
        }
        prevCatRef.current = form.category;
    }, [form.category]);

    // ── Field updater ─────────────────────────────────
    const update = (k: keyof FormState, v: string | boolean) => {
        if (k === 'description' && typeof v === 'string' && countWords(v) > DESC_MAX) return;
        if (k === 'detailedDescription' && typeof v === 'string' && countWords(v) > DETAIL_MAX) return;
        setForm(f => ({ ...f, [k]: v }));
    };

    // ── Submit ────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: async (data: FormState) => {
            const body = {
                name: data.name || data.category,
                category: data.category,
                description: data.description,
                imageUrl: data.imageUrl || null,
                brand: data.brand || null,
                detailedDescription: data.detailedDescription || null,
                productQuality: data.productQuality || null,
                warranty: data.warranty || null,
                hsnCode: data.hsnCode || null,
                stock: data.stock ? parseInt(data.stock) : 0,
                unit: data.unit || 'pcs',
                isBulk: data.isBulk,
                bulkDiscount: data.bulkDiscount || null,
                mrp: data.mrp || null,
                sellingPrice: data.sellingPrice || null,
                gstPercent: data.gstPercent || '18',
                lengthCm: data.lengthCm || null,
                widthCm: data.widthCm || null,
                heightCm: data.heightCm || null,
                weightKg: data.weightKg || null,
                selfDelivery: data.selfDelivery,
                vehicleType: vehicle || null,
                active: data.active,
                vendorId: data.vendorId ? parseInt(data.vendorId) : undefined,
            };
            const res = await fetch('/api/ops/catalog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to add product'); }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: '✅ Product Added', description: 'New catalog product has been added successfully.' });
            queryClient.invalidateQueries({ queryKey: ['/api/ops/catalog'] });
            setForm({ ...BLANK });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.vendorId) return toast({ title: 'Validation', description: 'Vendor is required', variant: 'destructive' });
        if (!form.category) return toast({ title: 'Validation', description: 'Category is required', variant: 'destructive' });
        if (!form.sellingPrice) return toast({ title: 'Validation', description: 'Selling Price is required', variant: 'destructive' });
        if (descWords > DESC_MAX) return toast({ title: 'Validation', description: `Description exceeds ${DESC_MAX} words`, variant: 'destructive' });
        if (detailWords > DETAIL_MAX) return toast({ title: 'Validation', description: `Detailed Description exceeds ${DETAIL_MAX} words`, variant: 'destructive' });
        if (form.mrp && form.sellingPrice && Number(form.sellingPrice) > Number(form.mrp))
            return toast({ title: 'Validation', description: 'Selling Price cannot exceed Unit Price', variant: 'destructive' });
        mutation.mutate(form);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Bulk Upload — Add Product</h2>
                <p className="text-gray-500 mb-6">Add new products to the catalog with full details</p>
            </div>

            {/* ── ADD PRODUCT FORM ───────────────────────── */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white mb-2 shadow-md">
                        <Package className="w-5 h-5" />
                    </div>
                    <CardTitle>Add New Inventory</CardTitle>
                    <CardDescription>Full product details matching vendor product form</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">

                        {/* ── LEFT COLUMN ─────────────────────── */}
                        <div className="space-y-5">

                            {/* Vendor Assignment */}
                            <div className="space-y-2 flex flex-col">
                                <Label className="flex items-center gap-1">Assign to Vendor <span className="text-red-500">*</span></Label>
                                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={vendorOpen}
                                            className={`justify-between w-full font-normal ${form.vendorId ? 'border-cyan-400 bg-cyan-50/30 text-cyan-900 font-semibold' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}
                                        >
                                            {form.vendorId && vendors
                                                ? (() => {
                                                    const v = vendors.find((v: any) => v.id.toString() === form.vendorId);
                                                    return v ? `${v.name} (VND${v.id.toString().padStart(3, '0')})` : "Select a vendor...";
                                                })()
                                                : "Select a vendor..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search vendors..." />
                                            <CommandList>
                                                <CommandEmpty>No vendor found.</CommandEmpty>
                                                <CommandGroup>
                                                    {vendors?.filter((v: any) => v.verificationStatus === 'verified').map((vendor: any) => (
                                                        <CommandItem
                                                            key={vendor.id}
                                                            value={`${vendor.name} VND${vendor.id.toString().padStart(3, '0')} ${vendor.businessType||''}`}
                                                            onSelect={() => {
                                                                update('vendorId', vendor.id.toString());
                                                                setVendorOpen(false);
                                                            }}
                                                        >
                                                            <Check className={`mr-2 h-4 w-4 ${form.vendorId === vendor.id.toString() ? "opacity-100" : "opacity-0"}`} />
                                                            <div className="flex flex-col">
                                                                <span>{vendor.name} {vendor.businessType ? `(${vendor.businessType})` : ''}</span>
                                                                <span className="text-xs text-gray-400 font-mono mt-0.5">VND{vendor.id.toString().padStart(3, '0')}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Brand */}
                            <div className="space-y-2">
                                <Label>Product Brand</Label>
                                <Input value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="e.g. UltraTech, Bosch..." />
                            </div>

                            {/* Description — 30 word limit */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Description</Label>
                                    <WordBadge count={descWords} max={DESC_MAX} />
                                </div>
                                <Textarea
                                    value={form.description}
                                    onChange={e => update('description', e.target.value)}
                                    rows={3}
                                    placeholder="Key features, material details... (max 30 words)"
                                    className={descWords > DESC_MAX ? 'border-red-400 bg-red-50' : ''}
                                />
                            </div>

                            {/* Image URL */}
                            <div className="space-y-2">
                                <Label>Image URL (optional)</Label>
                                <Input value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} placeholder="https://..." />
                            </div>

                            {/* Detailed Description — 200 word limit */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Detailed Description</Label>
                                    <WordBadge count={detailWords} max={DETAIL_MAX} />
                                </div>
                                <Textarea
                                    value={form.detailedDescription}
                                    onChange={e => update('detailedDescription', e.target.value)}
                                    rows={4}
                                    placeholder="Full product specifications, usage instructions... (max 200 words)"
                                    className={detailWords > DETAIL_MAX ? 'border-red-400 bg-red-50' : ''}
                                />
                            </div>

                            {/* Quality + Warranty */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Product Quality</Label>
                                    <Input value={form.productQuality} onChange={e => update('productQuality', e.target.value)} placeholder="e.g., Premium, Grade A" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Warranty</Label>
                                    <Input value={form.warranty} onChange={e => update('warranty', e.target.value)} placeholder="e.g., 1 Year, Lifetime" />
                                </div>
                            </div>

                            {/* Category + HSN */}
                            <div className="grid grid-cols-2 gap-4">
                                <CategoryAutocomplete value={form.category} onChange={v => update('category', v)} />
                                <div className="space-y-2">
                                    <Label>HSN Code</Label>
                                    <Input value={form.hsnCode} onChange={e => update('hsnCode', e.target.value)} placeholder="Auto-filled" />
                                </div>
                            </div>

                            {/* Stock + Unit */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <Label>Stock Quantity</Label>
                                    <Input type="number" value={form.stock}
                                        onChange={e => update('stock', e.target.value)}
                                        onFocus={() => setShowStockPicker(true)}
                                        onBlur={() => setTimeout(() => setShowStockPicker(false), 200)}
                                        placeholder="Enter stock"
                                    />
                                    {showStockPicker && (
                                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3 mt-1">
                                            <div className="text-xs font-bold text-gray-500 mb-2">Quick Select</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {STOCK_QUICK.map(n => (
                                                    <button key={n} type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); update('stock', String(n)); setShowStockPicker(false); }}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-cyan-100 hover:text-cyan-700 transition">
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Type</Label>
                                    <Select value={form.unit} onValueChange={v => update('unit', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {UNIT_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Bulk toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">Enable Bulk Order</span>
                                <Switch checked={form.isBulk} onCheckedChange={v => update('isBulk', v)} />
                            </div>
                            {form.isBulk && (
                                <div className="space-y-2 animate-in fade-in duration-300">
                                    <Label>Bulk Discount (%)</Label>
                                    <Input type="number" value={form.bulkDiscount} onChange={e => update('bulkDiscount', e.target.value)} placeholder="e.g. 10" />
                                </div>
                            )}

                            {/* Unit Price + Selling Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Unit Price (₹)</Label>
                                    <Input type="number" value={form.mrp} onChange={e => update('mrp', e.target.value)} placeholder="MRP" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Selling Price (₹) *</Label>
                                    <Input type="number" value={form.sellingPrice} onChange={e => update('sellingPrice', e.target.value)} placeholder="Your price" />
                                </div>
                            </div>

                            {/* GST % */}
                            <div className="space-y-2">
                                <Label>GST Percentage (%)</Label>
                                <Input type="number" value={form.gstPercent} onChange={e => update('gstPercent', e.target.value)} placeholder="18" />
                            </div>

                            {/* Total Price */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    Product Total Price (₹)
                                    <span className="text-[10px] font-normal text-cyan-600">Selling Price + GST ({gst}%)</span>
                                </Label>
                                <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 cursor-not-allowed select-none">
                                    ₹ {selling > 0 ? totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN — Logistics ────────── */}
                        <div className="space-y-5 border-l border-gray-100 pl-0 md:pl-8">
                            <h3 className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Logistics
                            </h3>

                            {/* Dimensions */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1"><Ruler className="w-3 h-3" /> L (cm)</Label>
                                    <Input type="number" value={form.lengthCm} onChange={e => update('lengthCm', e.target.value)} placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <Label>W (cm)</Label>
                                    <Input type="number" value={form.widthCm} onChange={e => update('widthCm', e.target.value)} placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <Label>H (cm)</Label>
                                    <Input type="number" value={form.heightCm} onChange={e => update('heightCm', e.target.value)} placeholder="0" />
                                </div>
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Scale className="w-3 h-3" /> Weight (kg)</Label>
                                <Input type="number" value={form.weightKg} onChange={e => update('weightKg', e.target.value)} placeholder="0" />
                            </div>

                            {/* Self Delivery */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/60 border border-blue-200/50">
                                <div>
                                    <span className="text-sm font-bold text-gray-700 block">Self Delivery</span>
                                    <span className="text-[11px] text-gray-500">
                                        {isHeavyCategory(form.category) ? '⚡ Auto-enabled for heavy material' : 'Vendor handles shipping'}
                                    </span>
                                </div>
                                <Switch checked={form.selfDelivery} onCheckedChange={v => update('selfDelivery', v)} />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-green-50/60 border border-green-200/50">
                                <div>
                                    <span className="text-sm font-bold text-gray-700 block">Active</span>
                                    <span className="text-[11px] text-gray-500">Product visible in catalog</span>
                                </div>
                                <Switch checked={form.active} onCheckedChange={v => update('active', v)} />
                            </div>

                            {/* Vehicle Prediction */}
                            <div className="mt-6">
                                <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-3">Predicted Vehicle Type</h4>
                                <div className="flex flex-col justify-center items-center h-36 overflow-hidden bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200 relative shadow-inner">
                                    <div className="text-4xl mb-2">
                                        {vehicle.includes('Two') ? '🏍️' : vehicle.includes('3-Wheeler') ? '🛺' : '🚛'}
                                    </div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 text-center px-4">{vehicle}</div>
                                </div>
                            </div>
                        </div>

                        {/* ── SUBMIT ──────────────────────────── */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                            <Button type="submit" className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 px-8" disabled={mutation.isPending}>
                                {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : '💾 Save Product'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* ── EXISTING CATALOG TABLE ─────────────────── */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Existing Catalog ({catalog?.length || 0} products)
                </h3>
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <Table className="w-full text-sm">
                        <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <TableRow>
                                <TableHead className="px-4 py-2 text-left font-semibold">NAME</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold">BRAND</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold">CATEGORY</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold">PRICE</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold">STOCK</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold">STATUS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100">
                            {catalogLoading ? (
                                <TableRow><TableCell colSpan={6} className="px-4 py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                            ) : !catalog?.length ? (
                                <TableRow><TableCell colSpan={6} className="px-4 py-6 text-center text-gray-500 italic">No catalog products yet</TableCell></TableRow>
                            ) : (
                                catalog.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-cyan-50/30 transition-colors">
                                        <TableCell className="px-4 py-3 font-medium text-gray-900">{item.name}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-600">{item.brand || '—'}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-600">{item.category}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-600">₹{item.sellingPrice || '—'}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-600">{item.stock ?? '—'}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
