import { useState } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./useAuth";
import { Building2, HardHat, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AuthPage({ role }: { role: "buyer" | "vendor" }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const { login, register, user } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (user) {
            setLocation(user.role === "buyer" ? "/marketplace" : "/vendor/dashboard");
        }
    }, [setLocation, user]);

    if (user) {
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
                        {isLogin
                            ? "Enter your credentials to access your account"
                            : "Set up your account to get started on DECHTA"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                            placeholder="you@company.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full mt-4 px-6 py-4 rounded-xl font-semibold bg-primary text-primary-foreground premium-shadow hover:premium-shadow-hover hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                    >
                        {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                            </span>
                        ) : (
                            isLogin ? "Sign In" : "Create Account"
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary hover:underline ml-1"
                    >
                        {isLogin ? "Sign up" : "Sign in"}
                    </button>
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
