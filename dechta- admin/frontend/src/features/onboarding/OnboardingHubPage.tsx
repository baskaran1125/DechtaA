import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    UserPlus, Truck, HardHat, Loader2, CheckCircle2,
    Upload, User, Phone, Building2, CreditCard, FileText, MapPin,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type OnboardingTab = 'add-vendor' | 'add-driver' | 'add-manpower';

const SKILL_TYPES = [
    "Carpenter",
    "Fabricator / Welder",
    "Mason",
    "Electrical",
    "Plumbing",
    "False Ceiling",
    "Tiles Laying",
    "AAC Panel Work",
];

const VEHICLE_TYPES = [
    "2-Wheeler",
    "3-Wheeler Open",
    "3-Wheeler Close",
    "4-Wheeler 750 KG Open",
    "4-Wheeler 750 KG Close",
    "4-Wheeler 1.4 Ton Open",
    "4-Wheeler 1.4 Ton Close",
    "4-Wheeler 1.7 Ton Open",
    "4-Wheeler 1.7 Ton Close",
    "4-Wheeler 2.5 Ton Open",
    "4-Wheeler 2.5 Ton Close",
];

const BUSINESS_TYPES = [
    "Retailer", "Wholesaler", "Distributor", "Manufacturer"
];

function normalizeDocUrl(url?: string | null): string | null {
    if (!url) return null;
    const raw = String(url).trim();
    if (!raw) return null;

    const backendBase = String(import.meta.env.VITE_API_URL || "http://127.0.0.1:5001").trim().replace(/\/+$/, "");

    if (/^https?:\/\//i.test(raw)) {
        return raw
            .replace(/localhost:\d+/g, "localhost:5001")
            .replace(/127\.0\.0\.1:\d+/g, "127.0.0.1:5001");
    }
    if (raw.startsWith("/uploads/")) return `${backendBase}${raw}`;
    if (raw.startsWith("uploads/")) return `${backendBase}/${raw}`;
    if (raw.startsWith("/")) return `${backendBase}${raw}`;
    return `${backendBase}/uploads/${raw}`;
}

// Upload a single file to the backend, returns the stored URL
async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/ops/upload-doc", {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "File upload failed");
    }
    const data = await res.json();
    return data.url as string;
}

export default function OnboardingHubPage() {
    const [activeView, setActiveView] = useState<OnboardingTab>('add-vendor');

    const navItems: Array<{ key: OnboardingTab; label: string }> = [
        { key: 'add-vendor', label: 'Add Vendor' },
        { key: 'add-driver', label: 'Add Driver' },
        { key: 'add-manpower', label: 'Add Manpower' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Onboarding Hub</h2>
                <p className="text-gray-500 mb-6">Create vendor, driver, and manpower records from one place.</p>
                <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                    {navItems.map((item) => (
                        <Button
                            key={item.key}
                            type="button"
                            variant="ghost"
                            onClick={() => setActiveView(item.key)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                activeView === item.key
                                    ? 'bg-black text-cyan-400 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>
            </div>
            {activeView === 'add-vendor' && (
                <AddVendorForm />
            )}
            {activeView === 'add-driver' && (
                <AddDriverForm />
            )}
            {activeView === 'add-manpower' && (
                <AddManpowerForm />
            )}
        </div>
    );
}

// ─── File Upload Field ───────────────────────────────────────────────────────

function FileUploadField({
    label, required, onUpload, uploading, uploadedUrl, accept = "*/*",
}: {
    label: string;
    required?: boolean;
    onUpload: (url: string) => void;
    uploading: boolean;
    uploadedUrl: string;
    accept?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localUploading, setLocalUploading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLocalUploading(true);
        try {
            const url = await uploadFile(file);
            onUpload(url);
        } catch (err: any) {
            alert("Upload failed: " + err.message);
        } finally {
            setLocalUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-dashed"
                    onClick={() => inputRef.current?.click()}
                    disabled={localUploading}
                >
                    {localUploading ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...</>
                    ) : (
                        <><Upload className="w-3.5 h-3.5 mr-1.5" /> Choose File</>
                    )}
                </Button>
                {uploadedUrl && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-cyan-600 hover:text-cyan-700"
                        onClick={() => setPreviewOpen(true)}
                    >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                )}
                {!uploadedUrl && !localUploading && (
                    <span className="text-xs text-gray-400">No file chosen</span>
                )}
                {uploadedUrl && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                    </span>
                )}
            </div>
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{label} Preview</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[75vh] overflow-auto rounded-lg border bg-gray-50 p-2">
                        <img
                            src={normalizeDocUrl(uploadedUrl) ?? uploadedUrl}
                            alt={`${label} preview`}
                            className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
    return (
        <div className={`flex items-center gap-2 pb-2 border-b border-gray-100 mb-4`}>
            <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
        </div>
    );
}

// ─── Add Vendor Form ─────────────────────────────────────────────────────────

function AddVendorForm() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        name: '',
        ownerName: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        password: '',
        businessAddress: '',
        googleMapsLocation: '',
        yearsOfBusinessExperience: '',
        businessType: '',
        gstNumber: '',
        panNumber: '',
        udyamRegistrationNumber: '',
        bankAccountNumber: '',
        bankIFSC: '',
        bankName: '',
        bankBranch: '',
    });
    const [docs, setDocs] = useState({
        passbookCancelledChequeUrl: '',
        gstCertificateUrl: '',
        shopLicenseUrl: '',
        vendorImageUrl: '',
        aadharProofUrl: '',
        panImageUrl: '',
        registrationCertificateUrl: '',
    });

    const setDoc = (key: keyof typeof docs) => (url: string) => setDocs((current) => ({ ...current, [key]: url }));

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form,
                ...docs,
                gstUrl: docs.gstCertificateUrl || null,
                shopLicenseUrl: docs.shopLicenseUrl || null,
                panUrl: docs.vendorImageUrl || null,
                aadharUrl: docs.aadharProofUrl || null,
                businessLicenseUrl: docs.passbookCancelledChequeUrl || null,
                cancelledChequeUrl: docs.passbookCancelledChequeUrl || null,
                panImageUrl: docs.panImageUrl || null,
                registrationCertificateUrl: docs.registrationCertificateUrl || null,
                bankAccountDetails: [form.bankAccountNumber, form.bankIFSC, form.bankName, form.bankBranch].filter(Boolean).join(' / ') || undefined,
            };
            const res = await fetch('/api/ops/onboarding/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create vendor');
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: 'Vendor Created', description: 'New vendor has been onboarded successfully.' });
            queryClient.invalidateQueries({ queryKey: ['/api/ops/onboarding/vendors/all'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ops/onboarding/vendors'] });
            setForm({
                name: '',
                ownerName: '',
                phone: '',
                whatsappNumber: '',
                email: '',
                password: '',
                businessAddress: '',
                googleMapsLocation: '',
                yearsOfBusinessExperience: '',
                businessType: '',
                gstNumber: '',
                panNumber: '',
                udyamRegistrationNumber: '',
                bankAccountNumber: '',
                bankIFSC: '',
                bankName: '',
                bankBranch: '',
            });
            setDocs({
                passbookCancelledChequeUrl: '',
                gstCertificateUrl: '',
                shopLicenseUrl: '',
                vendorImageUrl: '',
                aadharProofUrl: '',
                panImageUrl: '',
                registrationCertificateUrl: '',
            });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.ownerName || !form.phone || !form.email || !form.password) {
            toast({ title: 'Missing fields', description: 'Business name, owner name, mobile number, email and password are required.', variant: 'destructive' });
            return;
        }
        mutation.mutate();
    };

    const f = form;
    const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [k]: e.target.value }));

    return (
        <div>
            <Card className="max-w-3xl border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white mb-2 shadow-md">
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <CardTitle>Add New Vendor</CardTitle>
                    <CardDescription>Fill in the vendor's details to onboard them to the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    {mutation.isSuccess ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Vendor Created Successfully!</h3>
                            <p className="text-gray-500 mb-6">The vendor account has been created with pending verification status.</p>
                            <div className="flex gap-3">
                                <Button onClick={() => mutation.reset()} variant="outline">Add Another Vendor</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <SectionHeader icon={Building2} title="Basic Vendor Information" color="bg-cyan-50 text-cyan-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="v-name">Business Name *</Label>
                                        <Input id="v-name" placeholder="Business name" value={f.name} onChange={sf('name')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-owner">Owner / Contact Person Name *</Label>
                                        <Input id="v-owner" placeholder="Owner or contact person" value={f.ownerName} onChange={sf('ownerName')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-phone">Mobile Number *</Label>
                                        <Input id="v-phone" type="tel" placeholder="Mobile number" value={f.phone} onChange={sf('phone')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-whatsapp">WhatsApp Number</Label>
                                        <Input id="v-whatsapp" type="tel" placeholder="WhatsApp number" value={f.whatsappNumber} onChange={sf('whatsappNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-password">Password *</Label>
                                        <Input id="v-password" type="password" placeholder="Min 6 characters" value={f.password} onChange={sf('password')} required minLength={6} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="v-address">Business Address</Label>
                                        <Input id="v-address" placeholder="Business address" value={f.businessAddress} onChange={sf('businessAddress')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-maps">Google Maps Location</Label>
                                        <Input id="v-maps" placeholder="Maps link or location" value={f.googleMapsLocation} onChange={sf('googleMapsLocation')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-exp">Years of Business Experience</Label>
                                        <Input id="v-exp" placeholder="e.g. 5 years" value={f.yearsOfBusinessExperience} onChange={sf('yearsOfBusinessExperience')} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Type of Business</Label>
                                        <Select value={f.businessType} onValueChange={(value) => setForm((current) => ({ ...current, businessType: value }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select business type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BUSINESS_TYPES.map((type) => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionHeader icon={FileText} title="Business Verification" color="bg-cyan-50 text-cyan-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="v-gst-number">GST Number</Label>
                                        <Input id="v-gst-number" placeholder="GST number" value={f.gstNumber} onChange={sf('gstNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-pan-number">PAN Number</Label>
                                        <Input id="v-pan-number" placeholder="PAN number" value={f.panNumber} onChange={sf('panNumber')} className="uppercase" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="v-udyam">UDYAM / CIN Certificate</Label>
                                        <Input id="v-udyam" placeholder="UDYAM registration number or CIN" value={f.udyamRegistrationNumber} onChange={sf('udyamRegistrationNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-email">Email ID *</Label>
                                        <Input id="v-email" type="email" placeholder="vendor@example.com" value={f.email} onChange={sf('email')} required />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionHeader icon={CreditCard} title="Bank Details" color="bg-cyan-50 text-cyan-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="v-acc">Account Number</Label>
                                        <Input id="v-acc" placeholder="Bank account number" value={f.bankAccountNumber} onChange={sf('bankAccountNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-ifsc">IFSC Code</Label>
                                        <Input id="v-ifsc" placeholder="IFSC code" value={f.bankIFSC} onChange={sf('bankIFSC')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-bankname">Bank Name</Label>
                                        <Input id="v-bankname" placeholder="Bank name" value={f.bankName} onChange={sf('bankName')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="v-branch">Branch</Label>
                                        <Input id="v-branch" placeholder="Branch name" value={f.bankBranch} onChange={sf('bankBranch')} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionHeader icon={MapPin} title="Verification Uploads" color="bg-cyan-50 text-cyan-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileUploadField label="Passbook / Cancelled Cheque" onUpload={setDoc('passbookCancelledChequeUrl')} uploading={false} uploadedUrl={docs.passbookCancelledChequeUrl} />
                                    <FileUploadField label="PAN Image" onUpload={setDoc('panImageUrl')} uploading={false} uploadedUrl={docs.panImageUrl} />
                                    <FileUploadField label="Registration Certificate" onUpload={setDoc('registrationCertificateUrl')} uploading={false} uploadedUrl={docs.registrationCertificateUrl} />
                                    <FileUploadField label="GST Certificate Upload" onUpload={setDoc('gstCertificateUrl')} uploading={false} uploadedUrl={docs.gstCertificateUrl} />
                                    <FileUploadField label="Vendor Shop" onUpload={setDoc('shopLicenseUrl')} uploading={false} uploadedUrl={docs.shopLicenseUrl} />
                                    <FileUploadField label="Vendor Photo" onUpload={setDoc('vendorImageUrl')} uploading={false} uploadedUrl={docs.vendorImageUrl} />
                                    <FileUploadField label="Aadhar Proof" onUpload={setDoc('aadharProofUrl')} uploading={false} uploadedUrl={docs.aadharProofUrl} />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={mutation.isPending}>
                                {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Vendor'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Add Driver Form ──────────────────────────────────────────────────────────

function AddDriverForm() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        name: '', phone: '', licenseNumber: '',
        vehicleType: '', vehicleNumber: '',
        bankAccountNumber: '', bankIFSC: '', bankName: '', bankBranch: '',
        location: '', serviceRating: '0',
    });
    const [docs, setDocs] = useState({
        photoUrl: '', aadharUrl: '', addressProofUrl: '', rcBookUrl: '', licenseUrl: '', bankPassbookUrl: '',
    });

    const setDoc = (key: keyof typeof docs) => (url: string) => setDocs(d => ({ ...d, [key]: url }));

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form,
                email: `driver_${Date.now()}@dechta.internal`,
                status: 'active',
                ...docs,
            };
            const res = await fetch('/api/ops/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to register driver');
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: 'Driver Registered', description: 'New driver has been registered successfully.' });
            queryClient.invalidateQueries({ queryKey: ['/api/ops/drivers'] });
            setForm({ name: '', phone: '', licenseNumber: '', vehicleType: '', vehicleNumber: '', bankAccountNumber: '', bankIFSC: '', bankName: '', bankBranch: '', location: '', serviceRating: '0' });
            setDocs({ photoUrl: '', aadharUrl: '', addressProofUrl: '', rcBookUrl: '', licenseUrl: '', bankPassbookUrl: '' });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.phone || !form.licenseNumber) {
            toast({ title: 'Missing fields', description: 'Name, mobile number and license number are required.', variant: 'destructive' });
            return;
        }
        mutation.mutate();
    };

    const f = form;
    const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <div>
            <Card className="max-w-3xl border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-2 shadow-md">
                        <Truck className="w-5 h-5" />
                    </div>
                    <CardTitle>Add New Driver</CardTitle>
                    <CardDescription>Register a driver with complete vehicle, document and bank details</CardDescription>
                </CardHeader>
                <CardContent>
                    {mutation.isSuccess ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Driver Registered Successfully!</h3>
                            <p className="text-gray-500 mb-6">The driver has been added to the system with all documents.</p>
                            <div className="flex gap-3">
                                <Button onClick={() => mutation.reset()} variant="outline">Add Another Driver</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Personal Details */}
                            <div>
                                <SectionHeader icon={User} title="Personal Details" color="bg-blue-50 text-blue-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-name">Name *</Label>
                                        <Input id="dr-name" placeholder="Full name" value={f.name} onChange={sf('name')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-phone">Mobile Number *</Label>
                                        <Input id="dr-phone" type="tel" placeholder="Mobile number" value={f.phone} onChange={sf('phone')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vehicle Type *</Label>
                                        <Select value={f.vehicleType} onValueChange={v => setForm(p => ({ ...p, vehicleType: v }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select vehicle type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-license">License Number *</Label>
                                        <Input id="dr-license" placeholder="License number" value={f.licenseNumber} onChange={sf('licenseNumber')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-vnum">Vehicle Number</Label>
                                        <Input id="dr-vnum" placeholder="e.g. KA-01-AB-1234" value={f.vehicleNumber} onChange={sf('vehicleNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-loc">Location</Label>
                                        <Input id="dr-loc" placeholder="City or area" value={f.location} onChange={sf('location')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-rating">Service Rating (Initial)</Label>
                                        <Input id="dr-rating" type="number" step="0.1" min="0" max="5" placeholder="e.g. 4.5" value={f.serviceRating} onChange={sf('serviceRating')} />
                                    </div>
                                </div>
                            </div>

                            {/* Photo */}
                            <div>
                                <SectionHeader icon={Upload} title="Photo" color="bg-blue-50 text-blue-600" />
                                <FileUploadField
                                    label="Driver Photo"
                                    accept="image/*"
                                    onUpload={setDoc('photoUrl')}
                                    uploading={false}
                                    uploadedUrl={docs.photoUrl}
                                />
                            </div>

                            {/* Documents */}
                            <div>
                                <SectionHeader icon={FileText} title="Documents" color="bg-blue-50 text-blue-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileUploadField label="Address Proof" onUpload={setDoc('addressProofUrl')} uploading={false} uploadedUrl={docs.addressProofUrl} />
                                    <FileUploadField label="RC Book" onUpload={setDoc('rcBookUrl')} uploading={false} uploadedUrl={docs.rcBookUrl} />
                                    <FileUploadField label="Aadhar Card" onUpload={setDoc('aadharUrl')} uploading={false} uploadedUrl={docs.aadharUrl} />
                                    <FileUploadField label="Driving License" onUpload={setDoc('licenseUrl')} uploading={false} uploadedUrl={docs.licenseUrl} />
                                    <FileUploadField label="Bank Passbook" onUpload={setDoc('bankPassbookUrl')} uploading={false} uploadedUrl={docs.bankPassbookUrl} />
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div>
                                <SectionHeader icon={CreditCard} title="Bank Details" color="bg-blue-50 text-blue-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-acc">Account Number</Label>
                                        <Input id="dr-acc" placeholder="Bank account number" value={f.bankAccountNumber} onChange={sf('bankAccountNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-ifsc">IFSC Code</Label>
                                        <Input id="dr-ifsc" placeholder="IFSC code" value={f.bankIFSC} onChange={sf('bankIFSC')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-bank">Bank Name</Label>
                                        <Input id="dr-bank" placeholder="Bank name" value={f.bankName} onChange={sf('bankName')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dr-branch">Branch</Label>
                                        <Input id="dr-branch" placeholder="Branch name" value={f.bankBranch} onChange={sf('bankBranch')} />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={mutation.isPending}>
                                {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</> : 'Register Driver'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Add Manpower Form ────────────────────────────────────────────────────────

function AddManpowerForm() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        fullName: '', phone: '', qualification: '',
        aadharNumber: '', panNumber: '',
        serviceAddress: '', state: '', city: '', area: '',
        bankAccountNumber: '', bankIFSC: '', bankName: '', bankBranch: '',
        skill: '', experience: '', category: '',
    });
    const [docs, setDocs] = useState({
        photoUrl: '', aadharUrl: '', panUrl: '', bankMandateUrl: '', diplomaUrl: '',
    });
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    const setDoc = (key: keyof typeof docs) => (url: string) => setDocs(d => ({ ...d, [key]: url }));

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = { ...form, ...docs };
            const res = await fetch('/api/ops/manpower', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create worker');
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: 'Worker Added', description: 'New manpower worker has been onboarded successfully.' });
            queryClient.invalidateQueries({ queryKey: ['/api/ops/manpower'] });
            setForm({ fullName: '', phone: '', qualification: '', aadharNumber: '', panNumber: '', serviceAddress: '', state: '', city: '', area: '', bankAccountNumber: '', bankIFSC: '', bankName: '', bankBranch: '', skill: '', experience: '', category: '' });
            setSelectedSkills([]);
            setDocs({ photoUrl: '', aadharUrl: '', panUrl: '', bankMandateUrl: '', diplomaUrl: '' });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName || !form.phone) {
            toast({ title: 'Missing fields', description: 'Name and phone number are required.', variant: 'destructive' });
            return;
        }
        mutation.mutate();
    };

    const f = form;
    const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
    const toggleSkill = (skill: string) => {
        const exists = selectedSkills.includes(skill);
        if (exists) {
            const updated = selectedSkills.filter((s) => s !== skill);
            setSelectedSkills(updated);
            setForm((p) => ({ ...p, skill: updated.join(', ') }));
            return;
        }

        if (selectedSkills.length >= 3) {
            toast({ title: 'Maximum 3 skills', description: 'A manpower worker can choose up to 3 skills only.', variant: 'destructive' });
            return;
        }

        const updated = [...selectedSkills, skill];
        setSelectedSkills(updated);
        setForm((p) => ({ ...p, skill: updated.join(', ') }));
    };

    return (
        <div>
            <Card className="max-w-3xl border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white mb-2 shadow-md">
                        <HardHat className="w-5 h-5" />
                    </div>
                    <CardTitle>Add New Manpower Worker</CardTitle>
                    <CardDescription>Register a worker with complete personal, skill, document and bank details</CardDescription>
                </CardHeader>
                <CardContent>
                    {mutation.isSuccess ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Worker Added Successfully!</h3>
                            <p className="text-gray-500 mb-6">The manpower worker has been registered in the system.</p>
                            <div className="flex gap-3">
                                <Button onClick={() => mutation.reset()} variant="outline">Add Another Worker</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Personal Details */}
                            <div>
                                <SectionHeader icon={User} title="Personal Details" color="bg-violet-50 text-violet-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-name">Name *</Label>
                                        <Input id="mp-name" placeholder="Full name" value={f.fullName} onChange={sf('fullName')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-phone">Mobile Number *</Label>
                                        <Input id="mp-phone" type="tel" placeholder="Mobile number" value={f.phone} onChange={sf('phone')} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-qual">Highest Qualification</Label>
                                        <Input id="mp-qual" placeholder="e.g. 10th Pass, ITI, Diploma" value={f.qualification} onChange={sf('qualification')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-aadhar">Aadhar Number</Label>
                                        <Input id="mp-aadhar" placeholder="12-digit Aadhar number" value={f.aadharNumber} onChange={sf('aadharNumber')} maxLength={14} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-pan">PAN Number</Label>
                                        <Input id="mp-pan" placeholder="PAN number" value={f.panNumber} onChange={sf('panNumber')} maxLength={10} className="uppercase" />
                                    </div>
                                </div>
                            </div>

                            {/* Photo */}
                            <div>
                                <SectionHeader icon={Upload} title="Photo" color="bg-violet-50 text-violet-600" />
                                <FileUploadField
                                    label="Worker Photo"
                                    accept="image/*"
                                    onUpload={setDoc('photoUrl')}
                                    uploading={false}
                                    uploadedUrl={docs.photoUrl}
                                />
                            </div>

                            {/* Skill */}
                            <div>
                                <SectionHeader icon={HardHat} title="Skill Details" color="bg-violet-50 text-violet-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Type of Skill Known (Select up to 3)</Label>
                                        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                            {SKILL_TYPES.map((s) => (
                                                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSkills.includes(s)}
                                                        onChange={() => toggleSkill(s)}
                                                        className="h-4 w-4"
                                                    />
                                                    <span>{s}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Selected: {selectedSkills.length}/3
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-exp">Experience</Label>
                                        <Input id="mp-exp" placeholder="e.g. 3 years" value={f.experience} onChange={sf('experience')} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <SectionHeader icon={MapPin} title="Address" color="bg-violet-50 text-violet-600" />
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-svcaddr">Local Address</Label>
                                        <Input id="mp-svcaddr" placeholder="Full local address" value={f.serviceAddress} onChange={sf('serviceAddress')} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="mp-state">State</Label>
                                            <Input id="mp-state" placeholder="State" value={f.state} onChange={sf('state')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="mp-city">City</Label>
                                            <Input id="mp-city" placeholder="City" value={f.city} onChange={sf('city')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="mp-area">Area</Label>
                                            <Input id="mp-area" placeholder="Area" value={f.area} onChange={sf('area')} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <SectionHeader icon={FileText} title="Documents" color="bg-violet-50 text-violet-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileUploadField label="Aadhar Card Attachment" onUpload={setDoc('aadharUrl')} uploading={false} uploadedUrl={docs.aadharUrl} />
                                    <FileUploadField label="PAN Card Attachment" onUpload={setDoc('panUrl')} uploading={false} uploadedUrl={docs.panUrl} />
                                    <FileUploadField label="Bank Mandate" onUpload={setDoc('bankMandateUrl')} uploading={false} uploadedUrl={docs.bankMandateUrl} />
                                    <FileUploadField label="Diploma/ITI Certificate (if any)" onUpload={setDoc('diplomaUrl')} uploading={false} uploadedUrl={docs.diplomaUrl} />
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div>
                                <SectionHeader icon={CreditCard} title="Bank Details" color="bg-violet-50 text-violet-600" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-acc">Account Number</Label>
                                        <Input id="mp-acc" placeholder="Bank account number" value={f.bankAccountNumber} onChange={sf('bankAccountNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-ifsc">IFSC Code</Label>
                                        <Input id="mp-ifsc" placeholder="IFSC code" value={f.bankIFSC} onChange={sf('bankIFSC')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-bank">Bank Name</Label>
                                        <Input id="mp-bank" placeholder="Bank name" value={f.bankName} onChange={sf('bankName')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mp-branch">Branch</Label>
                                        <Input id="mp-branch" placeholder="Branch name" value={f.bankBranch} onChange={sf('bankBranch')} />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={mutation.isPending}>
                                {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding Worker...</> : 'Add Manpower Worker'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

