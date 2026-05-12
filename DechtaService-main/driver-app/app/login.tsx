// app/login.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  useColorScheme, Animated, Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AuthAPI } from '../services/api';

export default function LoginScreen() {
  const router      = useRouter();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === 'dark';

  const [mobile,      setMobile]      = useState('');
  const [mobileError, setMobileError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [isFocused,   setIsFocused]   = useState(false);

  const slideAnim = useState(new Animated.Value(20))[0];
  const fadeAnim  = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const native = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: native }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: native }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setMobile(cleaned);
    if (cleaned.length > 0 && cleaned.length < 10) {
      setMobileError('Mobile number must be 10 digits');
    } else if (cleaned.length === 10 && !/^[6-9]\d{9}$/.test(cleaned)) {
      setMobileError('Enter a valid Indian mobile number');
    } else {
      setMobileError('');
    }
  };

  const handleLogin = async () => {
    if (mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      setMobileError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setMobileError('');
    setLoading(true);

    try {
      const result = await AuthAPI.sendOtp(mobile);
      if (result.success) {
        // Pass mobile and devOtp (mock mode only) to verify screen.
        // devOtp will be empty string in production.
        router.push({
          pathname: '/verify',
          params: { mobile, devOtp: result.otp_for_testing || '' },
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const themeStyles    = isDark ? darkTheme : lightTheme;
  const isValidMobile  = mobile.length === 10 && /^[6-9]\d{9}$/.test(mobile);

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.title, themeStyles.text]}>Welcome Back</Text>
          <Text style={[styles.subtitle, themeStyles.subText]}>
            Enter your mobile number to continue.
          </Text>

          <View style={styles.formSpace}>
            <View style={[
              styles.inputWrapper,
              themeStyles.inputWrapper,
              isFocused ? styles.inputFocused : styles.inputUnfocused,
              mobileError ? styles.inputError : null,
            ]}>
              <Text style={[styles.prefix, themeStyles.text]}>+91</Text>
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder="Mobile Number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={handleMobileChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!loading}
              />
            </View>

            {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, (!isValidMobile || loading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!isValidMobile || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Get OTP</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  inner:          { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title:          { fontSize: 30, fontWeight: 'bold', marginBottom: 8 },
  subtitle:       { fontSize: 16, marginBottom: 32 },
  formSpace:      { gap: 12 },
  inputWrapper:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 60, borderRadius: 16, borderWidth: 2 },
  inputFocused:   { borderColor: '#0284c7' },
  inputUnfocused: { borderColor: 'transparent' },
  inputError:     { borderColor: '#ef4444' },
  errorText:      { color: '#ef4444', fontSize: 13, marginTop: -4, paddingLeft: 4 },
  prefix:         { fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  input:          { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 2, height: '100%' },
  button: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0284c7', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, height: 60,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText:     { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
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
