// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, AppState, AppStateStatus, Platform } from "react-native";
import { TokenStore, DriverStore } from "../services/api";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function isTokenValid(): Promise<boolean> {
  try {
    const token = await TokenStore.get();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload) { await TokenStore.remove(); return false; }
    if (payload.exp) {
      if (Math.floor(Date.now() / 1000) >= payload.exp) {
        await TokenStore.remove();
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);
  const checking = useRef(false);

  const checkAuth = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;

    try {
      const isAuth = await isTokenValid();

      // The first segment distinguishes between root index and (tabs) group
      const firstSegment = segments[0] || '';

      const isPublicRoute =
        !firstSegment ||
        firstSegment === 'login' ||
        firstSegment === 'verify';

      if (!isAuth && !isPublicRoute) {
        router.replace('/login');
      } else if (isAuth) {
        // Only redirect authenticated users if they are on a public login/verify/welcome screen
        // If they are already in (tabs) or register, don't force a redirect to avoid loops
        if (!firstSegment || firstSegment === 'login' || firstSegment === 'verify') {
          const driver = await DriverStore.get();
          const isRegistered = driver?.isRegistered === true || driver?.is_registered === true;
          router.replace(isRegistered ? '/(tabs)' : '/register');
        }
      }
    } catch {
      router.replace('/login');
    } finally {
      setChecked(true);
      checking.current = false;
    }
  }, [segments, router]);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkAuth();
    });
    return () => sub.remove();
  }, [checkAuth]);

  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index"    options={{ headerShown: false }} />
      <Stack.Screen name="login"    options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify"   options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
    </Stack>
  );
}
