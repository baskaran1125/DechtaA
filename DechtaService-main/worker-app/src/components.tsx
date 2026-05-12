import { Link, useLocation } from "wouter";
import { HardHat, LogOut, LayoutDashboard, ShoppingBag, PackageOpen } from "lucide-react";
import { useAuth } from "./hooks";
import { Button } from "@/components/ui/button";

export function Navbar() {
    const { user, logout } = useAuth();
    const [, setLocation] = useLocation();

    const handleLogout = async () => {
        await logout.mutateAsync();
        setLocation("/");
    };

    return (
        <nav className="glass-nav transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                        <div className="bg-primary text-primary-foreground p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                            <HardHat className="w-6 h-6" />
                        </div>
                        <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                            DECHTA
                        </span>
                    </Link>

                    <div className="flex items-center gap-6">
                        {user ? (
                            <>
                                {user.role === "buyer" && (
                                    <Link
                                        href="/marketplace"
                                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        Marketplace
                                    </Link>
                                )}

                                {user.role === "vendor" && (
                                    <Link
                                        href="/vendor/dashboard"
                                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Dashboard
                                    </Link>
                                )}

                                <Link
                                    href="/orders"
                                    className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <PackageOpen className="w-4 h-4" />
                                    Orders
                                </Link>

                                <div className="h-6 w-px bg-border mx-2"></div>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold text-foreground">{user.name}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleLogout}
                                        title="Log out"
                                        className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/auth/buyer"
                                    className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
                                >
                                    Buyer Login
                                </Link>
                                <Link href="/auth/vendor">
                                    <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                        Vendor Portal
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
