import { useState } from 'react';
import { Logo } from '../components/layout/Logo';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { sendOTP, loginAPI, registerAPI } from '../api/apiClient';

const LoginPage = ({ onLoginSuccess, isDark, toggleTheme, notify }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const getApiErrorMessage = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

  const handleSendOTP = async () => {
    if (mobile.replace(/\D/g, '').length < 10)
      return notify('Enter valid 10-digit mobile number', 'error');

    setLoading(true);
    try {
      const res = await sendOTP(mobile.replace(/\D/g, ''));
      setOtpSent(true);
      notify(`OTP Sent! (Dev: ${res.data.dev_otp})`, 'info');
    } catch (err) {
      notify(getApiErrorMessage(err, 'Failed to send OTP'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const phone = mobile.replace(/\D/g, '');
    setLoading(true);
    try {
      let res;
      if (isSignUp) {
        if (!shopName || !ownerName) {
          notify('Fill all required details', 'error');
          setLoading(false);
          return;
        }
        res = await registerAPI({ phone, otp, shopName, ownerName });
      } else {
        res = await loginAPI(phone, otp);
        if (res?.data?.isNewVendor) {
          setIsSignUp(true);
          notify(res?.data?.message || 'No vendor account found. Switched to registration mode.', 'info');
          setLoading(false);
          return;
        }
      }
      localStorage.setItem('dechta_token', res.data.token);
      onLoginSuccess(res.data.vendor);
      notify(isSignUp ? 'Account Created!' : 'Login Successful!', 'success');
    } catch (err) {
      const status = err?.response?.status;
      const apiData = err?.response?.data || {};

      if (!isSignUp && status === 404 && apiData.isNewVendor) {
        setIsSignUp(true);
        notify('No vendor account found. Switched to registration mode.', 'info');
      } else {
        notify(getApiErrorMessage(err, 'Authentication failed'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#0ceded]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-sm"
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <Card className="w-full max-w-lg shadow-2xl z-10 fade-in border-t-4 border-t-[#0ceded] my-8">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">
          {isSignUp ? 'Partner Registration' : 'Partner Login'}
        </h2>

        <p className="text-center text-xs text-gray-500 mb-8">
          {isSignUp
            ? 'Enter complete business details to verify.'
            : 'Access your shop dashboard using Mobile & OTP.'}
        </p>

        <div className="space-y-4">
          <Input
            label="Mobile Number"
            placeholder="+91 98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />

          {isSignUp && (
            <div className="fade-in space-y-3 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
              <Input
                label="Shop Name"
                placeholder="Quick Construct & Hardware"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <Input
                label="Owner Name"
                placeholder="John Doe"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          )}

          {otpSent && (
            <div className="fade-in">
              <Input
                label="Enter OTP"
                placeholder="1234"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}

          {!otpSent ? (
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-[#0ceded] hover:opacity-90 text-black font-bold py-3.5 rounded-xl shadow-lg transition active:scale-95"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          ) : (
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition active:scale-95"
            >
              {loading ? 'Please wait...' : `Verify & ${isSignUp ? 'Register' : 'Login'}`}
            </button>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          {isSignUp ? 'Already a partner?' : 'New to DECHTA?'}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setOtpSent(false);
              setOtp('');
            }}
            className="text-[#0ceded] font-bold hover:underline ml-1"
          >
            {isSignUp ? 'Sign In' : 'Register Shop'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;