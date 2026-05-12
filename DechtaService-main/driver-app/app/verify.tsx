// app/verify.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  useColorScheme, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthAPI } from '../services/api';

const RESEND_COOLDOWN = 30; // seconds

export default function VerifyScreen() {
  const router  = useRouter();
  const { mobile, devOtp: routeDevOtp } = useLocalSearchParams<{ mobile: string; devOtp?: string }>();
  const hasRecoveredMissingOtp = useRef(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const [resending, setResending] = useState(false);

  // devOtp passed from login screen (only populated in mock/dev mode)
  const [devOtp, setDevOtp] = useState<string>(routeDevOtp || '');

  // On mount, the OTP was already sent by login.tsx — start cooldown
  useEffect(() => {
    setCooldown(RESEND_COOLDOWN);
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resendAndRetry = async () => {
    if (hasRecoveredMissingOtp.current) return false;
    hasRecoveredMissingOtp.current = true;

    try {
      const result = await AuthAPI.sendOtp(mobile as string);
      if (!result.success) {
        return false;
      }

      const freshOtp = result.otp_for_testing || '';
      if (freshOtp) {
        setDevOtp(freshOtp);
        setOtp(freshOtp);
      }

      const retryOtp = freshOtp || otp;
      if (!retryOtp) {
        return false;
      }

      const retryResult = await AuthAPI.verifyOtp(mobile as string, retryOtp);
      if (retryResult.success) {
        const needsRegistration = retryResult.isNewDriver || !retryResult.driver?.isRegistered;
        if (needsRegistration) {
          router.replace({ pathname: '/register', params: { mobile: mobile as string } });
        } else {
          router.replace('/(tabs)');
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) return;
    setLoading(true);

    try {
      const result = await AuthAPI.verifyOtp(mobile as string, otp);

      if (result.success) {

        const needsRegistration = result.isNewDriver || !result.driver?.isRegistered;
        if (needsRegistration) {
          router.replace({ pathname: '/register', params: { mobile: mobile as string } });
        } else {
          router.replace('/(tabs)');
        }
      } else {
        const msg = result.message || 'Incorrect OTP. Please try again.';

        if (__DEV__ && /OTP not found|request a new one/i.test(msg)) {
          const recovered = await resendAndRetry();
          if (recovered) return;
        }

        if (Platform.OS === 'web') { window.alert('Invalid OTP\n\n' + msg); }
        else { Alert.alert('Invalid OTP', msg); }
        setOtp('');
      }
    } catch (err: any) {
      const msg = err.message || 'Verification failed. Try again.';
      if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
      else { Alert.alert('Error', msg); }
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const result = await AuthAPI.sendOtp(mobile as string);
      if (result.success) {
        if (result.otp_for_testing) {
          setDevOtp(result.otp_for_testing);
        }
        setCooldown(RESEND_COOLDOWN);
        setOtp('');
        if (Platform.OS === 'web') { window.alert('OTP Resent\n\nA new OTP has been sent.'); }
        else { Alert.alert('OTP Resent', 'A new OTP has been sent.'); }
      } else {
        throw new Error(result.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') { window.alert('Error\n\n' + err.message); }
      else { Alert.alert('Error', err.message); }
    } finally {
      setResending(false);
    }
  };

  const themeStyles = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, themeStyles.subText]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, themeStyles.text]}>Verify OTP</Text>
        <Text style={[styles.subtitle, themeStyles.subText]}>
          We sent a 4-digit code to +91 {mobile}
        </Text>

        {/* Dev OTP box — only visible in mock/dev mode */}
        {devOtp ? (
          <View style={styles.devOtpBox}>
            <Text style={styles.devOtpLabel}>🔑 Demo OTP (remove in production)</Text>
            <Text style={styles.devOtpValue}>{devOtp}</Text>
          </View>
        ) : null}

        <View style={styles.formSpace}>
          <View style={[
            styles.inputWrapper,
            themeStyles.inputWrapper,
            isFocused ? styles.inputFocused : styles.inputUnfocused,
          ]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder="----"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={4}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              editable={!loading}
              autoFocus
              textAlign="center"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (otp.length < 4 || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={otp.length < 4 || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Verify & Continue</Text>
            }
          </TouchableOpacity>

          {/* Resend OTP */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            style={styles.resendBtn}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : cooldown > 0 ? (
              <Text style={[styles.resendText, themeStyles.subText]}>
                Resend OTP in {cooldown}s
              </Text>
            ) : (
              <Text style={styles.resendTextActive}>Resend OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  inner:      { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 20, left: 24, padding: 10, zIndex: 10 },
  backText:   { fontSize: 16, fontWeight: 'bold' },
  title:      { fontSize: 30, fontWeight: 'bold', marginBottom: 8, marginTop: 40 },
  subtitle:   { fontSize: 16, marginBottom: 16, lineHeight: 24 },
  formSpace:  { gap: 16 },

  devOtpBox: {
    backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 16,
  },
  devOtpLabel: { fontSize: 11, color: '#92400e', fontWeight: '600', marginBottom: 4 },
  devOtpValue: { fontSize: 24, fontWeight: 'bold', color: '#b45309', letterSpacing: 8 },

  inputWrapper: {
    paddingHorizontal: 16, height: 70, borderRadius: 16,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  inputFocused:   { borderColor: '#0284c7' },
  inputUnfocused: { borderColor: 'transparent' },
  input: { fontSize: 32, fontWeight: 'black', letterSpacing: 16, width: '100%' },

  button: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0284c7', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, height: 60,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText:     { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  resendBtn:        { alignItems: 'center', paddingVertical: 8 },
  resendText:       { fontSize: 14 },
  resendTextActive: { fontSize: 14, color: '#0284c7', fontWeight: 'bold' },
});

const lightTheme = StyleSheet.create({
  container:    { backgroundColor: '#ffffff' },
  text:         { color: '#0f172a' },
  subText:      { color: '#64748b' },
  inputWrapper: { backgroundColor: '#f8fafc' },
});

const darkTheme = StyleSheet.create({
  container:    { backgroundColor: '#0f172a' },
  text:         { color: '#ffffff' },
  subText:      { color: '#94a3b8' },
  inputWrapper: { backgroundColor: '#1e293b' },
});
