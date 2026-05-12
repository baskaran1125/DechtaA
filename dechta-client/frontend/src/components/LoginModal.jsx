import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Phone, Check, ArrowLeft, User, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendOtp, verifyOtp as verifyOtpApi, updateProfile as updateProfileApi, googleAuth as googleAuthApi, completeGoogleProfile as completeGoogleProfileApi } from '../api/apiClient';
import { CLIENT_TOKEN_KEY } from '../api/apiClient';

/* ─── Google SVG Icon ─── */
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

/* ─── Divider ─── */
const Divider = ({ label = 'or' }) => (
    <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
    </div>
);

/* ─── Step Indicator ─── */
const StepDots = ({ current, total }) => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
            <span
                key={i}
                className={`rounded-full transition-all duration-300 ${i + 1 === current
                        ? 'w-6 h-2 bg-cyan-500'
                        : i + 1 < current
                            ? 'w-2 h-2 bg-cyan-300'
                            : 'w-2 h-2 bg-gray-200 dark:bg-slate-700'
                    }`}
            />
        ))}
    </div>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginModal({ open, onClose }) {
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const tokenRef = useRef(null);
    const { login } = useAuth();

    // Google OAuth state
    const [googleUserData, setGoogleUserData] = useState(null);
    const [googlePhone, setGooglePhone] = useState('');
    const googleBtnRef = useRef(null);
    const gsiInitialized = useRef(false);
    const gsiInitTimerRef = useRef(null);

    // ── Initialize Google Identity Services ──────────────────
    useEffect(() => {
        if (!open || gsiInitialized.current) return;
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
            console.warn('[Google] No VITE_GOOGLE_CLIENT_ID set — Google Sign-In will be disabled');
            return;
        }

        // Load GIS script if not already loaded
        const loadGSI = () => {
            if (window.google?.accounts?.id) {
                initializeGSI();
                return;
            }
            const existingScript = document.querySelector('script[data-gsi-client="true"]');
            if (existingScript) {
                gsiInitTimerRef.current = setTimeout(initializeGSI, 100);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.dataset.gsiClient = 'true';
            script.onload = () => {
                gsiInitTimerRef.current = setTimeout(initializeGSI, 100);
            };
            script.onerror = () => {
                console.warn('[Google] Failed to load GIS script');
            };
            document.head.appendChild(script);
        };

        const initializeGSI = () => {
            if (!window.google?.accounts?.id || gsiInitialized.current) return;
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
                gsiInitialized.current = true;
                console.log('[Google] GSI initialized');
            } catch (e) {
                console.warn('[Google] GSI init error:', e.message);
            }
        };

        loadGSI();

        return () => {
            if (gsiInitTimerRef.current) {
                clearTimeout(gsiInitTimerRef.current);
            }
        };
    }, [open]);

    // ── Google callback handler ──────────────────────────────
    const handleGoogleCallback = useCallback(async (response) => {
        if (!response?.credential) {
            setApiError('Google sign-in was cancelled');
            setGoogleLoading(false);
            return;
        }

        setGoogleLoading(true);
        setApiError('');

        try {
            const res = await googleAuthApi(response.credential);

            if (res.success && res.data?.token) {
                localStorage.setItem(CLIENT_TOKEN_KEY, res.data.token);
                tokenRef.current = res.data.token;

                const user = res.data.user;
                setGoogleUserData(user);

                if (res.data.isNewUser || !user.phone) {
                    // New user or missing phone → collect phone number
                    setName(user.name || '');
                    setStep(4); // Google phone collection step
                } else {
                    // Returning user with phone → direct login
                    login(user.name || user.email, user.phone);
                    resetAndClose();
                }
            } else {
                setApiError(res.message || 'Google sign-in failed');
            }
        } catch (e) {
            console.error('[Google] Auth error:', e.message);
            setApiError(e.message || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    }, [login]);

    /* ── Google Sign-In trigger ── */
    const handleGoogleSignIn = () => {
        setGoogleLoading(true);
        setApiError('');

        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
            setApiError('Google Sign-In is not configured yet. Please add VITE_GOOGLE_CLIENT_ID to your .env file.');
            setGoogleLoading(false);
            return;
        }

        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Fallback: use renderButton approach
                    console.log('[Google] Prompt not displayed, trying popup');
                    try {
                        // Use the OAuth2 popup flow as fallback
                        const client = window.google.accounts.oauth2?.initTokenClient?.({
                            client_id: GOOGLE_CLIENT_ID,
                            scope: 'openid email profile',
                            callback: async (tokenResponse) => {
                                // We need an ID token, not an access token
                                // Re-try with ID approach
                                setGoogleLoading(false);
                                setApiError('Please disable popup blocker and try again.');
                            },
                        });
                        if (client) {
                            client.requestAccessToken();
                        } else {
                            setGoogleLoading(false);
                            setApiError('Google Sign-In popup was blocked. Please allow popups.');
                        }
                    } catch (e) {
                        setGoogleLoading(false);
                        setApiError('Google Sign-In popup was blocked. Please allow popups and try again.');
                    }
                }
            });
        } else {
            setGoogleLoading(false);
            setApiError('Google Sign-In is loading. Please try again in a moment.');
        }
    };

    /* ── Phone OTP handlers ── */
    const handleSendOtp = async () => {
        if (phone.length !== 10) return;
        setLoading(true);
        setApiError('');
        try {
            await sendOtp(phone);
            setStep(2);
        } catch (e) {
            console.warn('[OTP] API error, using mock fallback:', e.message);
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) return;
        setLoading(true);
        setApiError('');
        try {
            const res = await verifyOtpApi(phone, otpString, name);
            if (res.success && res.data?.token) {
                localStorage.setItem(CLIENT_TOKEN_KEY, res.data.token);
                tokenRef.current = res.data.token;
                const userName = res.data.user?.name || '';
                if (userName) {
                    login(userName, phone);
                    resetAndClose();
                } else {
                    setStep(3);
                }
            } else {
                setApiError(res.message || 'Verification failed');
            }
        } catch (e) {
            console.warn('[OTP] Verify API error, using mock fallback:', e.message);
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await updateProfileApi({ name: name.trim() });
        } catch (_) { /* best-effort */ }
        login(name.trim(), phone);
        resetAndClose();
        setLoading(false);
    };

    /* ── Google profile completion — collect phone ── */
    const handleGoogleComplete = async () => {
        if (googlePhone.length !== 10) return;
        setLoading(true);
        setApiError('');
        try {
            const res = await completeGoogleProfileApi(googlePhone, name.trim());
            if (res.success && res.data?.token) {
                // Replace with updated JWT containing phone
                localStorage.setItem(CLIENT_TOKEN_KEY, res.data.token);
                login(name.trim() || googleUserData?.name || googleUserData?.email, googlePhone);
                resetAndClose();
            } else {
                setApiError(res.message || 'Failed to save phone number');
            }
        } catch (e) {
            setApiError(e.message || 'Failed to complete profile');
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setStep(1); setPhone(''); setOtp(['', '', '', '']); setName(''); setApiError('');
        setGoogleUserData(null); setGooglePhone(''); setGoogleLoading(false);
        onClose();
    };

    const handleOtpChange = (i, v) => {
        if (v.length > 1) return;
        const newOtp = [...otp]; newOtp[i] = v; setOtp(newOtp);
        if (v && i < 3) document.getElementById(`otp-${i + 1}`)?.focus();
    };

    const handleOtpKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !otp[i] && i > 0) {
            document.getElementById(`otp-${i - 1}`)?.focus();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={resetAndClose}
            />

            {/* Modal card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden">

                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-500" />

                <div className="p-8">
                    {/* Close */}
                    <button
                        onClick={resetAndClose}
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Back button for step 2 */}
                    {step === 2 && (
                        <button
                            onClick={() => { setStep(1); setOtp(['', '', '', '']); setApiError(''); }}
                            className="absolute top-5 left-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Logo mark */}
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 border border-cyan-100 dark:border-cyan-800/40 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                        {step === 4 ? (
                            googleUserData?.avatar_url ? (
                                <img src={googleUserData.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <User className="w-7 h-7 text-cyan-600" />
                            )
                        ) : (
                            <Phone className="w-7 h-7 text-cyan-600" />
                        )}
                    </div>

                    {/* Error */}
                    {apiError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-2.5 mb-4 text-center">
                            {apiError}
                        </div>
                    )}

                    {/* ── Step 1: Phone Entry ── */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 text-center">
                                Welcome back
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                                Sign in or create your account
                            </p>

                            {/* Google Sign-In */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading}
                                className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 mb-1"
                            >
                                {googleLoading ? (
                                    <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                ) : (
                                    <GoogleIcon />
                                )}
                                {googleLoading ? 'Signing in…' : 'Continue with Google'}
                            </button>

                            <Divider label="or use phone" />

                            {/* Phone input */}
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 text-left">
                                Mobile Number
                            </label>
                            <div className="flex items-center gap-2 border-2 border-gray-200 dark:border-slate-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-500 rounded-xl px-4 py-3 mb-4 transition-colors">
                                <span className="font-bold text-gray-500 dark:text-gray-400 text-sm select-none">+91</span>
                                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 font-bold text-gray-900 dark:text-white text-base focus:outline-none bg-transparent placeholder:font-normal placeholder:text-gray-400"
                                    placeholder="Enter phone number"
                                    onKeyDown={e => e.key === 'Enter' && phone.length === 10 && handleSendOtp()}
                                />
                            </div>

                            <button
                                onClick={handleSendOtp}
                                disabled={phone.length !== 10 || loading}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 dark:border-gray-400/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                                        Sending OTP…
                                    </span>
                                ) : 'Send OTP →'}
                            </button>

                            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                                By continuing, you agree to our{' '}
                                <a href="#" className="text-cyan-600 hover:underline">Terms</a> &amp;{' '}
                                <a href="#" className="text-cyan-600 hover:underline">Privacy Policy</a>
                            </p>
                        </div>
                    )}

                    {/* ── Step 2: OTP Verification ── */}
                    {step === 2 && (
                        <div>
                            <StepDots current={1} total={2} />
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 text-center">
                                Verify OTP
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
                                Code sent to <span className="font-semibold text-gray-700 dark:text-gray-300">+91 {phone}</span>
                            </p>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-6 text-center">
                                Mock OTP: 1234
                            </p>

                            <div className="flex gap-3 justify-center mb-6">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        className={`w-14 h-14 text-center text-2xl font-black border-2 rounded-xl focus:outline-none transition-colors bg-white dark:bg-slate-800 dark:text-white ${d
                                                ? 'border-cyan-400 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                                : 'border-gray-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-500'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.join('').length !== 4}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 dark:border-gray-400/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                                        Verifying…
                                    </span>
                                ) : 'Verify & Continue →'}
                            </button>

                            <button
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="w-full text-sm text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 mt-3 py-1 transition-colors disabled:opacity-40"
                            >
                                Resend OTP
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Name Entry (Phone OTP flow) ── */}
                    {step === 3 && (
                        <div>
                            <StepDots current={2} total={2} />
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 text-center">
                                Almost there!
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                                What should we call you?
                            </p>

                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 text-left">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && name.trim() && handleFinish()}
                                className="w-full border-2 border-gray-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-xl px-4 py-3 font-bold text-base text-gray-900 dark:text-white focus:outline-none mb-4 bg-transparent transition-colors placeholder:font-normal placeholder:text-gray-400"
                                placeholder="Your full name"
                                autoFocus
                            />

                            <button
                                onClick={handleFinish}
                                disabled={loading || !name.trim()}
                                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Check className="w-4 h-4" />
                                {loading ? 'Saving…' : "Let's go!"}
                            </button>
                        </div>
                    )}

                    {/* ── Step 4: Google Sign-In — Collect Phone ── */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 text-center">
                                One last step
                            </h2>

                            {googleUserData?.email && (
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                        {googleUserData.email}
                                    </p>
                                </div>
                            )}

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                                Add your phone number for order updates
                            </p>

                            {/* Name field — pre-filled from Google */}
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 text-left">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border-2 border-gray-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-xl px-4 py-3 font-bold text-base text-gray-900 dark:text-white focus:outline-none mb-4 bg-transparent transition-colors placeholder:font-normal placeholder:text-gray-400"
                                placeholder="Your full name"
                            />

                            {/* Phone input */}
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 text-left">
                                Mobile Number
                            </label>
                            <div className="flex items-center gap-2 border-2 border-gray-200 dark:border-slate-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-500 rounded-xl px-4 py-3 mb-4 transition-colors">
                                <span className="font-bold text-gray-500 dark:text-gray-400 text-sm select-none">+91</span>
                                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={googlePhone}
                                    onChange={e => setGooglePhone(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 font-bold text-gray-900 dark:text-white text-base focus:outline-none bg-transparent placeholder:font-normal placeholder:text-gray-400"
                                    placeholder="Enter phone number"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && googlePhone.length === 10 && handleGoogleComplete()}
                                />
                            </div>

                            <button
                                onClick={handleGoogleComplete}
                                disabled={loading || googlePhone.length !== 10}
                                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving…
                                    </span>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Complete Setup
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    // Skip phone — login with just Google data
                                    login(googleUserData?.name || googleUserData?.email || 'User', '');
                                    resetAndClose();
                                }}
                                className="w-full text-sm text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 mt-3 py-1 transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
