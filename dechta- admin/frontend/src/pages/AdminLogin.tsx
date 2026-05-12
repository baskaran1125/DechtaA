import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminLogin() {
    const { login, logout, user } = useAuth();
    const [, setLocation] = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user?.role === "admin") {
            setLocation("/");
        }
    }, [user, setLocation]);

    if (user?.role === "admin") {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const res = await login.mutateAsync({ email, password });
            if (res.role !== "admin") {
                await logout.mutateAsync();
                setError("Unauthorized: Admin access required.");
                return;
            }
            setLocation("/");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Invalid credentials");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Login Card */}
            <Card className="w-full max-w-md relative z-10 border-gray-100 shadow-2xl backdrop-blur-sm">
                <CardHeader className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white mb-4 shadow-lg">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
                        DECHTA Admin
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">Sign in to the admin dashboard</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Enter your admin credentials and you will be redirected to the dashboard after successful sign in.
                    </div>

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Admin Email</Label>
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 bg-gray-50 px-4 text-gray-900 focus-visible:ring-cyan-500"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-xl border-gray-200 bg-gray-50 px-4 pr-12 text-gray-900 focus-visible:ring-cyan-500"
                                    placeholder="••••••••"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={login.isPending}
                            className="mt-6 h-12 w-full rounded-xl bg-black text-cyan-400 font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                        >
                            {login.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </Button>
                    </form>

                </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
                <p>© 2026 DECHTA. All rights reserved.</p>
            </div>
        </div>
    );
}
