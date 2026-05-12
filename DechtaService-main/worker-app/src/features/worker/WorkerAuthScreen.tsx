import { useState, useRef, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useWorker } from './WorkerContext';
import { workerSendOtp, workerVerifyOtp } from './workerSupabase';
import WorkerSignupScreen from './WorkerSignupScreen';

const RESEND_COOLDOWN = 30; // seconds

interface WorkerAuthScreenProps {
  onLogin: () => void;
}

export default function WorkerAuthScreen({ onLogin }: WorkerAuthScreenProps) {
  const { state, setState, showToast, t } = useWorker();

  // Step: 'mobile' → 'otp' → 'signup'
  const [step,      setStep]      = useState<'mobile' | 'otp' | 'signup'>('mobile');
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const [devOtp,    setDevOtp]    = useState('');
  const cooldownTimerRef = useRef<number | null>(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // ── Countdown timer ─────────────────────────────────────────
  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ────────────────────────────────────────
  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      showToast('Enter a valid 10-digit mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await workerSendOtp(cleaned);
      setDevOtp(result?.dev_otp || '');
      setStep('otp');
      startCooldown();
      showToast('OTP sent to your mobile', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      showToast('Enter the 4-digit OTP', 'error');
      return;
    }
    setLoading(true);
    try {
      const cleaned = phone.replace(/\D/g, '');
      const result = await workerVerifyOtp(cleaned, otp);

      // Store JWT token in localStorage for API calls
      if (result.token) {
        localStorage.setItem('dechta_worker_token', result.token);
      }

      // Check if new worker
      if (result.isNewWorker) {
        // New worker — show signup form
        setStep('signup');
        showToast('Welcome! Let\'s complete your profile.', 'success');
      } else {
        // Existing worker — login directly
        const worker = result.worker;
        const workerId = String(worker?.id ?? worker?.workerId ?? worker?.profileId ?? '').trim();
        const resolvedPhone = String(worker?.mobile ?? worker?.phone ?? cleaned).trim();
        const resolvedName = String(worker?.fullName ?? worker?.name ?? '').trim();
        const resolvedSkillCategory = String(worker?.skillCategory ?? worker?.qualification ?? '').trim();
        const resolvedIsProfileComplete = Boolean(
          worker?.isProfileComplete ?? worker?.is_profile_complete ?? worker?.isRegistered ?? worker?.is_registered ?? false
        );
        const resolvedSelectedSkills = Array.isArray(worker?.skillCategories)
          ? worker.skillCategories.filter(Boolean)
          : [];

        setState(p => ({
          ...p,
          isLoggedIn: true,
          loginStartTime: Date.now(),
          user: {
            ...p.user,
            id: workerId,
            phone: resolvedPhone,
            name: resolvedName,
            qualification: resolvedSkillCategory,
            location: {
              state: String(worker?.state || ''),
              city: String(worker?.city || ''),
              area: String(worker?.area || ''),
              address: String(worker?.address || ''),
            },
            isProfileComplete: resolvedIsProfileComplete,
            isApproved: Boolean(worker?.isApproved ?? worker?.is_approved ?? false),
            isDocumentsSubmitted: Boolean(worker?.isDocumentsSubmitted ?? worker?.is_documents_submitted ?? false),
            selectedCategory: resolvedSkillCategory || 'All Works',
            selectedSkills: resolvedSelectedSkills,
            aadharNumber: '',
            panNumber: '',
            idProofType: 'Aadhaar',
          },
          isPremium: Boolean(worker?.isPremium || false),
          isFrozen: Boolean(worker?.isFrozen || false),
        }));

        showToast('Successfully Connected!', 'success');
        onLogin();
      }
    } catch (err: any) {
      showToast(err.message || 'Invalid OTP. Try again.', 'error');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setOtp('');
    await handleSendOtp();
  };

  return (
    step === 'signup' ? (
      // Signup form
      <WorkerSignupScreen
        phone={phone}
        otp={otp}
        onSuccess={onLogin}
        onBack={() => {
          setStep('otp');
          setOtp('');
        }}
      />
    ) : (
      // Auth form (mobile + OTP)
      <div className="worker-auth">
        {/* Top actions: language + theme */}
        <div className="auth-top-actions">
          <div className="w-lang-toggle-group">
            {(['en', 'hi', 'ta'] as const).map(lang => (
              <button key={lang} className={`w-lang-toggle-btn ${state.language === lang ? 'active' : ''}`}
                onClick={() => setState(p => ({ ...p, language: lang }))}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button className={`w-theme-toggle ${state.theme === 'light' ? 'light-active' : ''}`}
            onClick={() => {
              const newTheme = state.theme === 'dark' ? 'light' : 'dark';
              setState(p => ({ ...p, theme: newTheme }));
            }}>
            <div className="w-theme-flip-inner">
              <div className="w-theme-flip-front" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Moon size={16} /></div>
              <div className="w-theme-flip-back"  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Sun  size={16} /></div>
            </div>
          </button>
        </div>

        <div className="auth-card w-glass" style={{ maxWidth: 400 }}>
          {/* Brand */}
          <div className="brand-header">
            <img
              src={state.theme === 'light' ? '/logo-light.png' : '/logo-dark.png'}
              alt="Dechta"
              style={{ width: 180, display: 'block', margin: '0 auto 12px auto' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p className="auth-subtitle">{t('auth_subtitle')}</p>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: step === 'otp' ? '#f97316' : 'var(--border)' }} />
          </div>

          {/* ── STEP 1: Mobile number ── */}
          {step === 'mobile' && (
            <>
              <button
                onClick={() => { window.location.href = 'http://localhost:5173/login'; }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}
              >
                ← Back to Role Selection
              </button>
              <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
                Worker Login
              </h2>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Enter your 10-digit mobile number to receive an OTP
              </p>
              <div className="w-field">
                <input
                  type="tel"
                  placeholder={t('placeholder_mobile') || '10-digit mobile number'}
                  maxLength={10}
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button
                className="w-btn-primary"
                onClick={handleSendOtp}
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                style={{ marginTop: 16 }}
              >
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>
            </>
          )}

          {/* ── STEP 2: OTP verification ── */}
          {step === 'otp' && (
            <>
              <button
                onClick={() => { setStep('mobile'); setOtp(''); setDevOtp(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 8, padding: 0 }}
              >
                ← Change number
              </button>
              <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
                Verify OTP
              </h2>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                A 4-digit OTP was sent to +91 {phone}
              </p>

              {/* Mock OTP preview (shown only when backend returns dev_otp) */}
              {devOtp && (
                <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Mock OTP (testing)</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#b45309', letterSpacing: 8 }}>{devOtp}</div>
                </div>
              )}

              <div className="w-field">
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  maxLength={4}
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{ textAlign: 'center', fontSize: 22, letterSpacing: 10, fontWeight: 'bold' }}
                  autoFocus
                />
              </div>

              <button
                className="w-btn-primary"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 4}
                style={{ marginTop: 16 }}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              {/* Resend */}
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>
                {cooldown > 0 ? (
                  `Resend OTP in ${cooldown}s`
                ) : (
                  <>
                    Didn't receive?{' '}
                    <button
                      onClick={handleResend}
                      style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </p>
            </>
          )}

          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
            🔒 {t('secure_msg') || 'Secure OTP authentication'}
          </p>
        </div>
      </div>
    )
  );
}
