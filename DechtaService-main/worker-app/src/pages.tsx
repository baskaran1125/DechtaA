import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Plus,
    Package,
    X,
    CheckCircle2,
    Building2,
    HardHat,
    ArrowLeft,
    PackageOpen,
    ShoppingCart,
    Tag,
    Clock,
    XCircle,
} from "lucide-react";
import { useAuth, useProducts, useVendorProducts, useCreateProduct, useCatalogItems, useOrders, useCreateOrder } from "./hooks";
import { Navbar } from "./components";
import { useToast } from "@/hooks/use-toast";

// ============ AUTH PAGE ============
export function AuthPage({ role }: { role: "buyer" | "vendor" }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const { login, register, user } = useAuth();
    const [, setLocation] = useLocation();

    if (user) {
        setLocation(user.role === "buyer" ? "/marketplace" : "/vendor/dashboard");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (isLogin) {
                await login.mutateAsync({ email, password });
            } else {
                await register.mutateAsync({ name, email, password, role });
            }
            setLocation(role === "buyer" ? "/marketplace" : "/vendor/dashboard");
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        }
    };

    const isPending = login.isPending || register.isPending;

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            <div className="w-full md:w-[480px] lg:w-[560px] p-8 lg:p-16 flex flex-col justify-center bg-white shadow-2xl shadow-black/5 z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-12 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <div className="mb-10">
                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                        {role === "buyer" ? <Building2 className="w-6 h-6" /> : <HardHat className="w-6 h-6" />}
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        {isLogin ? `Welcome back, ${role}` : `Join as a ${role}`}
                    </h1>
                    <p className="text-muted-foreground">
                        {isLogin ? "Enter your credentials to access your account" : "Set up your account to get started on DECHTA"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Full Name</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans" placeholder="John Doe" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Email Address</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans" placeholder="you@company.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans" placeholder="••••••••" />
                    </div>
                    {error && <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">{error}</div>}
                    <button type="submit" disabled={isPending} className="w-full mt-4 px-6 py-4 rounded-xl font-semibold bg-primary text-primary-foreground premium-shadow hover:premium-shadow-hover hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200">
                        {isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span> : isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline ml-1">{isLogin ? "Sign up" : "Sign in"}</button>
                </p>
            </div>

            <div className="hidden md:block flex-1 relative bg-muted">
                {role === "buyer" ? (
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=1600&fit=crop" alt="Architecture" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&h=1600&fit=crop" alt="Warehouse" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]"></div>
            </div>
        </div>
    );
}

// ============ VENDOR DASHBOARD ============
export function VendorDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: products, isLoading: productsLoading } = useVendorProducts();
    const { data: catalog, isLoading: catalogLoading } = useCatalogItems();
    const createProduct = useCreateProduct();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<number | null>(null);
    const [price, setPrice] = useState("");

    if (authLoading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!user || user.role !== "vendor") { setLocation("/"); return null; }

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCatalogItemId) { toast({ variant: "destructive", title: "Selection Required", description: "You must select a master catalog item." }); return; }
        try {
            await createProduct.mutateAsync({ catalogItemId: selectedCatalogItemId, price });
            toast({ title: "Product Listed Successfully!" });
            setIsDialogOpen(false);
            setSelectedCatalogItemId(null);
            setPrice("");
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Vendor Dashboard</h1>
                        <p className="text-muted-foreground text-lg">Manage your inventory and track your listings.</p>
                    </div>
                    <button onClick={() => setIsDialogOpen(true)} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 premium-shadow hover:premium-shadow-hover hover:-translate-y-0.5 active:translate-y-0 transition-all font-sans">
                        <Plus className="w-5 h-5" /> Add New Material
                    </button>
                </div>

                {productsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (products as any[])?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-secondary/30 rounded-[2rem] border border-dashed border-border">
                        <Package className="w-16 h-16 text-muted-foreground mb-6" />
                        <h2 className="text-2xl font-bold text-foreground mb-2">No Active Listings</h2>
                        <p className="text-muted-foreground mb-8">Start adding materials to your catalog to receive orders.</p>
                        <button onClick={() => setIsDialogOpen(true)} className="px-6 py-3 rounded-xl bg-white border border-border text-foreground font-semibold shadow-sm hover:shadow-md hover:border-primary transition-all font-sans">Add First Product</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {(products as any[])?.map((product) => (
                            <div key={product.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col">
                                {product.imageUrl && <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-muted"><img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /></div>}
                                <div className="flex items-center gap-2 mb-2"><span className="px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">{product.category}</span></div>
                                <h3 className="font-bold text-lg text-foreground mb-1">{product.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{product.description}</p>
                                <div className="pt-4 border-t border-border mt-auto flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Unit Price</span>
                                    <span className="text-xl font-display font-bold">${Number(product.price).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {isDialogOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDialogOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/50">
                            <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30">
                                <h2 className="text-2xl font-display font-bold">Add New Material</h2>
                                <button onClick={() => setIsDialogOpen(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleAddProduct} className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-foreground">Select Master Catalog Item</label>
                                    {catalogLoading ? (
                                        <div className="flex justify-center py-8 border border-border rounded-xl"><Loader2 className="w-6 h-6 animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
                                            {(catalog as any[])?.map((item) => (
                                                <div key={item.id} onClick={() => setSelectedCatalogItemId(item.id)} className={`cursor-pointer rounded-xl border p-3 flex gap-3 items-center transition-all ${selectedCatalogItemId === item.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50 bg-background"}`}>
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden relative">
                                                        {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                                                        {selectedCatalogItemId === item.id && <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary fill-background" /></div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{item.category}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(catalog as any[])?.length === 0 && <p className="col-span-full text-center py-8 text-sm text-muted-foreground">The master catalog is currently empty.</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border">
                                    <label className="text-sm font-bold text-foreground">Your Listing Price ($)</label>
                                    <input type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans" placeholder="0.00" />
                                    <p className="text-xs text-muted-foreground">This is the price buyers will pay you directly for this material.</p>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsDialogOpen(false)} className="px-6 py-3 rounded-xl font-semibold hover:bg-muted text-foreground transition-colors font-sans">Cancel</button>
                                    <button type="submit" disabled={createProduct.isPending || !selectedCatalogItemId} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 font-sans">
                                        {createProduct.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "List Product"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============ MARKETPLACE ============
export function Marketplace() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: products, isLoading: productsLoading } = useProducts();
    const createOrder = useCreateOrder();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [buyingId, setBuyingId] = useState<number | null>(null);

    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!user || user.role !== "buyer") { setLocation("/"); return null; }

    const handleBuy = async (productId: number) => {
        try {
            setBuyingId(productId);
            await createOrder.mutateAsync({ productId, quantity: 1 });
            toast({ title: "Order Placed Successfully", description: "Your order has been submitted to the vendor." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Order Failed", description: err.message || "Could not place order at this time." });
        } finally {
            setBuyingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-display font-bold text-foreground mb-4">Marketplace</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">Browse and procure high-quality construction materials from verified vendors across the network.</p>
                </div>

                {productsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" /><p>Loading catalog...</p></div>
                ) : products?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-secondary/30 rounded-[2rem] border border-dashed border-border">
                        <PackageOpen className="w-16 h-16 text-muted-foreground mb-6" />
                        <h2 className="text-2xl font-bold text-foreground mb-2">No Products Available</h2>
                        <p className="text-muted-foreground">Vendors haven't listed any materials yet. Check back soon.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products?.map((product, i) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }} key={product.id} className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col">
                                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center"><Tag className="w-12 h-12 text-muted-foreground/30" /></div>}
                                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-foreground shadow-sm">{product.category}</div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2 mb-2">{product.name}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{product.description}</p>
                                    <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/50">
                                        <div><span className="text-xs text-muted-foreground font-medium block">Price / unit</span><span className="text-2xl font-display font-bold text-foreground">${Number(product.price).toFixed(2)}</span></div>
                                        <button onClick={() => handleBuy(product.id)} disabled={buyingId === product.id} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                            {buyingId === product.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> Buy</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// ============ ORDERS PAGE ============
export function OrdersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: orders, isLoading: ordersLoading } = useOrders();
    const [, setLocation] = useLocation();

    if (authLoading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!user) { setLocation("/"); return null; }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case "cancelled": return <XCircle className="w-5 h-5 text-destructive" />;
            default: return <Clock className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
            default: return "bg-amber-50 text-amber-700 border-amber-200";
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10">
                    <h1 className="text-4xl font-display font-bold text-foreground mb-2">Orders</h1>
                    <p className="text-muted-foreground text-lg">{user.role === "buyer" ? "Track your material purchases." : "Manage incoming orders for your materials."}</p>
                </div>

                {ordersLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : orders?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-[2rem] border border-border shadow-sm">
                        <PackageOpen className="w-16 h-16 text-muted-foreground/50 mb-6" />
                        <h2 className="text-xl font-bold text-foreground mb-2">No Orders Found</h2>
                        <p className="text-muted-foreground">{user.role === "buyer" ? "You haven't placed any orders yet." : "You don't have any incoming orders yet."}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders?.map((order) => (
                            <div key={order.id} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-sm font-bold text-muted-foreground">Order #{order.id.toString().padStart(6, "0")}</span>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize flex items-center gap-1.5 border ${getStatusClass(order.status)}`}>{getStatusIcon(order.status)}{order.status}</div>
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">{order.product.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {user.role === "vendor" ? <>Buyer: <span className="font-semibold text-foreground">{order.buyer.name}</span> ({order.buyer.email})</> : <>Category: <span className="font-semibold text-foreground">{order.product.category}</span></>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-8 md:border-l border-border md:pl-8 pt-4 md:pt-0 border-t md:border-t-0">
                                    <div className="text-center md:text-right"><span className="block text-sm text-muted-foreground font-medium mb-1">Quantity</span><span className="text-2xl font-bold text-foreground">{order.quantity}</span></div>
                                    <div className="text-right"><span className="block text-sm text-muted-foreground font-medium mb-1">Total Amount</span><span className="text-2xl font-display font-bold text-primary">${(Number(order.product.price) * order.quantity).toFixed(2)}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
