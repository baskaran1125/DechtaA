import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/useAuth";
import { useOrders } from "./useOrders";
import { Navbar } from "@/components/Navbar";
import { Loader2, PackageOpen, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function OrdersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: orders, isLoading: ordersLoading } = useOrders();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!authLoading && !user) {
            setLocation("/");
        }
    }, [authLoading, setLocation, user]);

    if (authLoading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!user) return null;

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
                    <p className="text-muted-foreground text-lg">
                        {user.role === "buyer" ? "Track your material purchases." : "Manage incoming orders for your materials."}
                    </p>
                </div>

                {ordersLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : orders?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-[2rem] border border-border shadow-sm">
                        <PackageOpen className="w-16 h-16 text-muted-foreground/50 mb-6" />
                        <h2 className="text-xl font-bold text-foreground mb-2">No Orders Found</h2>
                        <p className="text-muted-foreground">
                            {user.role === "buyer" ? "You haven't placed any orders yet." : "You don't have any incoming orders yet."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders?.map((order) => (
                            <div
                                key={order.id}
                                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-6"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-sm font-bold text-muted-foreground">Order #{order.id.toString().padStart(6, '0')}</span>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize flex items-center gap-1.5 border ${getStatusClass(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-foreground mb-1">
                                        {order.product.name}
                                    </h3>

                                    <p className="text-sm text-muted-foreground mb-4">
                                        {user.role === "vendor"
                                            ? <>Buyer: <span className="font-semibold text-foreground">{order.buyer.name}</span> ({order.buyer.email})</>
                                            : <>Category: <span className="font-semibold text-foreground">{order.product.category}</span></>
                                        }
                                    </p>
                                </div>

                                <div className="flex items-center gap-8 md:border-l border-border md:pl-8 pt-4 md:pt-0 border-t md:border-t-0">
                                    <div className="text-center md:text-right">
                                        <span className="block text-sm text-muted-foreground font-medium mb-1">Quantity</span>
                                        <span className="text-2xl font-bold text-foreground">{order.quantity}</span>
                                    </div>

                                    <div className="text-right">
                                        <span className="block text-sm text-muted-foreground font-medium mb-1">Total Amount</span>
                                        <span className="text-2xl font-display font-bold text-primary">
                                            ${(Number(order.product.price) * order.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
