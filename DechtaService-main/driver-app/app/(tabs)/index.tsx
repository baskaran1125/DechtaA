import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  Modal, Animated, Easing, Dimensions, Alert, Image, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from 'expo-router';
import PrimePartnerView from "../../components/PrimePartnerView";
import { useSocket } from "../../hooks/useSocket";
import { EarningsAPI, DriverAPI, OrdersAPI, MiscAPI } from "../../services/api";

const { width } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════════════
// NEW ORDER SIDE-DRAWER
// ═══════════════════════════════════════════════════════════════════════════
function NewOrderPopup({ order, isPrime, onAccept, onDecline }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(!isPrime ? 10 : 0);

  const slideAnim = useRef(new Animated.Value(width)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const nativeDriver = Platform.OS !== 'web';
    Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.poly(4)), useNativeDriver: nativeDriver }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 500, useNativeDriver: nativeDriver }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: nativeDriver }),
      ])
    ).start();
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [bounceAnim, slideAnim]);

  useEffect(() => {
    if (!isLoading && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading, timeLeft]);

  const displayData = {
    id: order?.id || order?.order_id || "Unknown",
    type: order?.product_name || order?.order_type || order?.type || "New Order",
    distance: order?.distance_text || order?.distance || "Calculated at pickup",
    payout: order?.delivery_fee || order?.payout_amount || order?.payout || order?.total_amount || 0,
    pickup: order?.vendor_shop_name || order?.pickup_address || order?.pickup || "Pickup Location",
    drop: order?.delivery_address || order?.client_address || order?.drop || "Drop Location",
    paymentType: "CASH",
    reqBody: order?.body_type_requested || order?.body_type || "Any",
  };

  return (
    <Modal transparent visible={!!order} animationType="fade">
      <View style={styles.modalOverlayRight}>
        <Animated.View style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity onPress={() => onDecline(order?.id)} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#64748b" />
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.loadingView}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.popupHeader}>
                <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                  <LinearGradient colors={["#60A5FA", "#0284C7"]} style={styles.orderIconBox}>
                    <Feather name="package" size={32} color="#fff" />
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.orderPopupTitle}>New Order Available!</Text>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabelText}>Partner Status: </Text>
                  {isPrime ? (
                    <LinearGradient colors={["#FBBF24", "#D97706"]} style={styles.primeBadge}>
                      <Feather name="star" size={10} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.primeBadgeText}>PRIME</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.normalBadge}>
                      <Text style={styles.normalBadgeText}>NORMAL</Text>
                    </View>
                  )}
                </View>

                {!isPrime && timeLeft > 0 && (
                  <View style={styles.waitBoxAmber}>
                    <Text style={styles.waitBoxTitleAmber}>⏳ Please Wait</Text>
                    <Text style={styles.waitBoxTextAmber}>
                      Normal partners must wait{" "}
                      <Text style={{ fontWeight: "900", fontSize: 16 }}>{timeLeft}</Text> seconds
                    </Text>
                  </View>
                )}
                {!isPrime && timeLeft === 0 && (
                  <View style={styles.waitBoxGreen}>
                    <Text style={styles.waitBoxTitleGreen}>✓ You can now respond to this order</Text>
                  </View>
                )}
              </View>

              <View style={styles.orderDetailsCard}>
                <View style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderType}>{displayData.type}</Text>
                    <Text style={styles.orderDistance}>{displayData.distance} • {displayData.reqBody} Body</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.orderPayout}>₹{displayData.payout}</Text>
                    <Text style={styles.orderPaymentType}>{displayData.paymentType}</Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <View style={styles.pickupDot}><Feather name="map-pin" size={12} color="#475569" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabel}>Pickup Location</Text>
                    <Text style={styles.locationText} numberOfLines={2}>{displayData.pickup}</Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <View style={styles.dropDot}><Feather name="map-pin" size={12} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabel}>Drop Location</Text>
                    <Text style={styles.locationText} numberOfLines={2}>{displayData.drop}</Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.actionRow,
                  timeLeft > 0 && !isPrime && { opacity: 0.5 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => onDecline(order?.id)}
                  disabled={timeLeft > 0 && !isPrime}
                  style={styles.declineBtn}
                >
                  <Feather name="x-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onAccept(order?.id)}
                  disabled={timeLeft > 0 && !isPrime}
                  style={{ flex: 1 }}
                >
                  <LinearGradient colors={["#22C55E", "#059669"]} style={styles.acceptBtn}>
                    <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.acceptText}>Accept</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [isOnline,   setIsOnline]   = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [ringingOrder, setRingingOrder] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [showLangModal, setShowLangModal] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrimeModal, setShowPrimeModal] = useState(false);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);

  // ── Real data state ──────────────────────────────────────────
  const [todayStats, setTodayStats] = useState({ orders: 0, earnings: 0 });
  const [weeklyOrders, setWeeklyOrders]       = useState(0);   // kept for pilot bar on home card
  const [weeklyAccepted, setWeeklyAccepted]   = useState(0);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [driverName, setDriverName] = useState("Partner");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [vehicleType, setVehicleType] = useState<"2wheeler" | "3wheeler" | "4wheeler">("4wheeler");

  // ── Hours tracking ────────────────────────────────────────────
  // loginSeconds       : cumulative online seconds across ALL sessions this week
  // completionMinutes  : total order-trip minutes completed today (from backend)
  // accumulatedSecondsRef : saves seconds when going offline so clock resumes
  const [loginSeconds, setLoginSeconds] = useState(0);
  const [completionMinutes, setCompletionMinutes] = useState(0);
  const onlineStartRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
  const [promoMedia, setPromoMedia] = useState<string[]>([]);

  // Runs once on mount
useEffect(() => {
  loadOnlineStatus();
}, []);

// Re-runs every time the home tab is focused (after completing a trip, etc.)
useFocusEffect(
  useCallback(() => {
    loadDashboardData();
  }, [])
);

  // Socket.io hook for real-time order notifications
  const { isConnected, setDriverStatus } = useSocket({
    onNewOrder: (order: any) => {
      if (isOnline) {
        console.log('[Home] New order received via socket:', order.id);
        setRingingOrder(order);
      }
    },
    onOrderUpdate: (data: any) => {
      console.log('[Home] Order update:', data);
    },
    onNotification: (notification: any) => {
      console.log('[Home] Notification received:', notification);
    },
  });

  useEffect(() => {
    if (!driverId || !isConnected) return;
    setDriverStatus(driverId, isOnline);
  }, [driverId, isOnline, isConnected, setDriverStatus]);

  // ── Login hours ticker ───────────────────────────────────────
  // When going ONLINE  : start a new session timer. Display = accumulated + current session.
  // When going OFFLINE : save current session into accumulatedSecondsRef, freeze display at total.
  // Next time ONLINE   : resumes from the saved total — never resets to 0.
  useEffect(() => {
    if (isOnline) {
      onlineStartRef.current = Date.now();
      const interval = setInterval(() => {
        const currentSession = Math.floor((Date.now() - (onlineStartRef.current || Date.now())) / 1000);
        setLoginSeconds(accumulatedSecondsRef.current + currentSession);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // Save this session's seconds before stopping
      if (onlineStartRef.current) {
        const sessionSeconds = Math.floor((Date.now() - onlineStartRef.current) / 1000);
        accumulatedSecondsRef.current += sessionSeconds;
        setLoginSeconds(accumulatedSecondsRef.current); // freeze at total, don't reset
      }
      onlineStartRef.current = null;
    }
  }, [isOnline]);

  // ── Format seconds → HH:MM:SS ────────────────────────────────
  const formatDuration = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ── Format minutes → HH:MM ────────────────────────────────────
  const formatMinutes = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Load current online status from API
  const loadOnlineStatus = async () => {
    try {
      const profile = await DriverAPI.getProfile();
      if (profile.success && profile.data?.profile) {
        const p      = profile.data.profile;
        setDriverId(String(p.id || profile.data?.driver?.id || ''));
        const online   = p.is_online   || false;
        const approved = p.is_approved || false;
        setIsOnline(online);
        setIsApproved(approved);
        // Load driver name from profile
        if (p.full_name) setDriverName(p.full_name);
        // Load vehicle type to show correct truck animation
        if (profile.data?.vehicle?.vehicle_type) {
          setVehicleType(profile.data.vehicle.vehicle_type as any);
        }
        if (online && !onlineStartRef.current) {
          onlineStartRef.current = Date.now();
        }
      }
    } catch (error) {
      console.error('Failed to load online status:', error);
    }
  };

  const loadDashboardData = async () => {
    // 1. Promos (non-fatal)
    try {
      const promosRes = await MiscAPI.getPromos();
      if (promosRes.success && promosRes.data?.length > 0) {
        setPromoMedia(promosRes.data.map((ad: any) => ad.image_url).filter(Boolean));
      } else {
        setPromoMedia([]);
      }
    } catch (e) {
      setPromoMedia([]);
      console.log('[Home] getPromos error:', e);
    }

    // 2. Earnings Summary (critical)
    try {
      const summary = await EarningsAPI.getSummary();
      if (summary.success && summary.data) {
        const d = summary.data;
        setTodayStats({
          orders:   d.today?.orders || 0,
          earnings: d.today?.net    || d.today?.earnings || 0,
        });
        setWeeklyOrders(d.weekly?.orders    || 0);
        setWeeklyAccepted(d.weekly?.accepted  || 0);
        setWeeklyCompleted(d.weekly?.completed || 0);
        setCompletionMinutes(d.today?.active_minutes || 0);
      } else {
        const msg = summary.message || 'Failed to load earnings dashboard.';
        if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
        else { Alert.alert('Error', msg); }
      }
    } catch (e: any) {
      console.log('[Home] getSummary error:', e);
      const msg = e.message || 'Network error loading earnings dashboard.';
      if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
      else { Alert.alert('Error', msg); }
    }

    // 3. Notifications (non-fatal)
    try {
      const notifRes = await DriverAPI.getNotifications();
      if (notifRes.success) setAlerts(notifRes.data || []);
    } catch {}
  };

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const nativeDriver = Platform.OS !== 'web';
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -2, duration: 400, useNativeDriver: nativeDriver }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: nativeDriver }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(slideAnim, { toValue: -20, duration: 600, easing: Easing.linear, useNativeDriver: nativeDriver })
    ).start();

    const slideInterval = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % Math.max(1, promoMedia.length)),
      4000
    );
    return () => clearInterval(slideInterval);
  }, [bounceAnim, promoMedia.length, slideAnim]);

  // Toggle online/offline - now calls API to update database
  const toggleOnline = async () => {
    if (isOnline) {
      setShowOfflineConfirm(true);
    } else {
      // Approval gate — must be approved before going online
      if (!isApproved) {
        let approvedNow = false;
        try {
          const profile = await DriverAPI.getProfile();
          approvedNow = !!profile?.data?.profile?.is_approved;
          if (approvedNow) setIsApproved(true);
        } catch {}

        if (!approvedNow) {
          const msg = 'Your account is pending admin approval.\nYou cannot go online until approved.';
          if (Platform.OS === 'web') { window.alert('Pending Approval\n\n' + msg); }
          else { Alert.alert('Pending Approval', msg); }
          return;
        }
      }
      // Going online — call real API only
      try {
        setIsOnline(true);
        const result = await DriverAPI.setOnlineStatus(true);
        if (!result.success) {
          setIsOnline(false);
          const msg = result.message || 'Failed to go online. Please try again.';
          if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
          else { Alert.alert('Error', msg); }
        } else if (driverId) {
          setDriverStatus(driverId, true);
        }
      } catch (error: any) {
        setIsOnline(false);
        const msg = error.message || 'Failed to go online';
        if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
        else { Alert.alert('Error', msg); }
      }
    }
  };

  const confirmGoOffline = async () => {
    try {
      const result = await DriverAPI.setOnlineStatus(false);
      if (result.success) {
        setIsOnline(false);
        setShowOfflineConfirm(false);
        if (driverId) {
          setDriverStatus(driverId, false);
        }
      } else {
        const msg = 'Failed to go offline. Please try again.';
        if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
        else { Alert.alert('Error', msg); }
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to go offline';
      if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
      else { Alert.alert('Error', msg); }
    }
  };

  // Accept order — call real API then navigate
  const acceptOrder = async (id: string) => {
    const currentOrder = ringingOrder;
    setRingingOrder(null);

    try {
      const result = await OrdersAPI.accept(String(id));
      const acceptedData = result.success ? result.trip : currentOrder;
      router.push({
        pathname: "/orders",
        params: { incomingOrder: JSON.stringify(acceptedData || currentOrder) },
      });
    } catch {
      router.push({
        pathname: "/orders",
        params: { incomingOrder: JSON.stringify(currentOrder) },
      });
    }
  };

  const currentOrders = todayStats.orders;
  const dailyMilestones = [
    { t: 0, r: 0 }, { t: 5, r: 50 }, { t: 10, r: 100 }, { t: 15, r: 250 }, { t: 20, r: 500 },
  ];
  const dailyProgress = Math.min(100, (currentOrders / 20) * 100);
  // Completion score: (completed / accepted) × 100. Capped at 100.
  const completionScore = weeklyAccepted === 0
    ? 0
    : Math.min(100, Math.round((weeklyCompleted / weeklyAccepted) * 100));
  // isPrimePartner = Pilot status THIS week (earned last week by hitting both targets).
  // Replace with a direct backend flag (e.g. d.isPilot) when the API supports it.
  const loginHoursWeekly = loginSeconds / 3600;
  const loginReached     = loginHoursWeekly >= 38;
  const scoreReached     = completionScore  >= 65;
  const isPrimePartner   = loginReached && scoreReached;  // 2 targets only
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      {/* HEADER */}
      <View style={[styles.header, theme.header]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={["#38BDF8", "#2563EB"]} style={styles.logoBox}>
            <Text style={styles.logoText}>Dechta</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.greetingText, theme.text]}>Hi, {driverName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? "#22c55e" : "#94a3b8" }]} />
              <Text style={[styles.statusText, theme.subText]}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleOnline}
            style={[styles.toggleSwitch, isOnline ? { backgroundColor: "#22c55e" } : { backgroundColor: isDark ? "#334155" : "#CBD5E1" }]}
          >
            <View style={styles.toggleLabels}>
              <Text style={[styles.toggleLabelText, isOnline ? { opacity: 1 } : { opacity: 0 }]}>ON</Text>
              <Text style={[styles.toggleLabelText, !isOnline ? { opacity: 1 } : { opacity: 0 }]}>OFF</Text>
            </View>
            <View style={[styles.toggleKnob, isOnline ? { transform: [{ translateX: 28 }] } : { transform: [{ translateX: 2 }] }]}>
              <Feather name="power" size={12} color={isOnline ? "#22c55e" : "#94a3b8"} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowLangModal(true)} style={[styles.iconBtn, theme.input]}>
            <Feather name="globe" size={18} color={isDark ? "#cbd5e1" : "#475569"} />
            <View style={styles.langBadge}><Text style={styles.langBadgeText}>{currentLang}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsDark(!isDark)}>
            <LinearGradient colors={isDark ? ["#4f46e5", "#9333ea"] : ["#fbbf24", "#f97316"]} style={styles.themeBtn}>
              <Feather name={isDark ? "moon" : "sun"} size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowNotifications(true)} style={[styles.iconBtn, theme.input]}>
            <Feather name="bell" size={18} color={isDark ? "#cbd5e1" : "#475569"} />
            {alerts.length > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.langBadgeText}>{alerts.filter((a: any) => !a.is_read).length || alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO TRUCK BANNER */}
        <LinearGradient colors={isDark ? ["#1e293b", "#0f172a"] : ["#38bdf8", "#2563eb"]} style={styles.heroCard}>
          <Feather name={isDark ? "moon" : "sun"} size={32} color={isDark ? "#cbd5e1" : "#fde047"} style={styles.celestial} />
          <Feather name="cloud" size={40} color="rgba(255,255,255,0.2)" style={{ position: "absolute", top: 30, right: 80 }} />

          <View style={styles.heroStats}>
            <Text style={styles.heroStatsLabel}>Today&apos;s Earnings</Text>
            <Text style={styles.heroStatsValue}>₹{todayStats.earnings}</Text>
            {/* ── Hours row — lives inside the hero card ── */}
            <View style={styles.heroHoursRow}>
              <View style={styles.heroHoursBadge}>
                <View style={[styles.heroHoursDot, { backgroundColor: isOnline ? "#22c55e" : "rgba(255,255,255,0.4)" }]} />
                <Text style={styles.heroHoursLabel}>Login</Text>
                <Text style={styles.heroHoursValue}>{formatDuration(loginSeconds)}</Text>
              </View>
              <View style={[styles.heroHoursBadge, { marginLeft: 8 }]}>
                <Feather name="check-circle" size={9} color="rgba(255,255,255,0.7)" style={{ marginRight: 3 }} />
                <Text style={styles.heroHoursLabel}>Completion</Text>
                <Text style={styles.heroHoursValue}>{formatMinutes(completionMinutes)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroTripsBadge}>
            <Text style={styles.heroTripsText}>{todayStats.orders} Trips</Text>
          </View>

          <View style={styles.roadContainer}>
            <Animated.View style={[styles.roadLine, { transform: [{ translateX: slideAnim }] }]} />
          </View>

          <Animated.View style={[styles.nativeTruck, { transform: [{ translateY: bounceAnim }] }]}>
            {vehicleType === "2wheeler" ? (
              // ── 2-Wheeler: Scooter ──────────────────────────────────
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                {/* Body */}
                <View style={{ width: 44, height: 28, backgroundColor: "#F8FAFC", borderTopLeftRadius: 14, borderTopRightRadius: 8, borderBottomRightRadius: 4, justifyContent: "center", alignItems: "center" }}>
                  <View style={{ width: 20, height: 8, backgroundColor: "#0284C7", borderRadius: 4, marginBottom: 2 }} />
                </View>
                {/* Handlebar + head */}
                <View style={{ width: 14, height: 20, backgroundColor: "#CBD5E1", borderTopRightRadius: 6, marginLeft: 2, justifyContent: "flex-start", alignItems: "center", paddingTop: 2 }}>
                  <View style={{ width: 8, height: 6, backgroundColor: "#334155", borderRadius: 2 }} />
                </View>
                {/* Wheels */}
                <View style={[styles.truckWheel, { left: 4, width: 14, height: 14, borderRadius: 7 }]}><View style={[styles.wheelRim, { width: 5, height: 5, borderRadius: 2.5 }]} /></View>
                <View style={[styles.truckWheel, { right: 2, width: 14, height: 14, borderRadius: 7 }]}><View style={[styles.wheelRim, { width: 5, height: 5, borderRadius: 2.5 }]} /></View>
              </View>
            ) : vehicleType === "3wheeler" ? (
              // ── 3-Wheeler: Auto Rickshaw ────────────────────────────
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                {/* Cargo box */}
                <View style={{ width: 55, height: 38, backgroundColor: "#FEF3C7", borderTopLeftRadius: 6, borderTopRightRadius: 2, borderBottomWidth: 4, borderBottomColor: "#CBD5E1", justifyContent: "center", alignItems: "center" }}>
                  <View style={{ position: "absolute", top: 10, width: "100%", height: 6, backgroundColor: "#F59E0B" }} />
                  <Text style={{ fontSize: 6, fontWeight: "900", color: "#92400E", marginTop: 4 }}>AUTO</Text>
                </View>
                {/* Cab */}
                <View style={{ width: 22, height: 32, backgroundColor: "#FDE68A", borderTopRightRadius: 8, borderBottomRightRadius: 4, justifyContent: "flex-start", alignItems: "center", paddingTop: 4 }}>
                  <View style={{ width: 10, height: 10, backgroundColor: "#334155", borderTopRightRadius: 3, borderBottomLeftRadius: 2 }} />
                </View>
                {/* 3 wheels */}
                <View style={[styles.truckWheel, { left: 6 }]}><View style={styles.wheelRim} /></View>
                <View style={[styles.truckWheel, { left: 38 }]}><View style={styles.wheelRim} /></View>
                <View style={[styles.truckWheel, { right: 4, bottom: -3, width: 14, height: 14, borderRadius: 7 }]}><View style={[styles.wheelRim, { width: 5, height: 5, borderRadius: 2.5 }]} /></View>
              </View>
            ) : (
              // ── 4-Wheeler: Truck (default) ───────────────────────────
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <View style={styles.truckTrailer}>
                  <View style={styles.trailerStripe} />
                  <Text style={styles.trailerText}>Dechta LOGISTICS</Text>
                </View>
                <View style={styles.truckCab}>
                  <View style={styles.truckWindow} />
                </View>
                <View style={[styles.truckWheel, { left: 10 }]}><View style={styles.wheelRim} /></View>
                <View style={[styles.truckWheel, { left: 45 }]}><View style={styles.wheelRim} /></View>
                <View style={[styles.truckWheel, { right: 5 }]}><View style={styles.wheelRim} /></View>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* DAILY TARGET CARD */}
        <View style={[styles.card, theme.card]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LinearGradient colors={["#34D399", "#059669"]} style={styles.targetIcon}>
                <Feather name="check" size={20} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={[styles.cardTitle, theme.text]}>Daily Target</Text>
                <Text style={theme.subText}>Earn extra cash today!</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.targetCount}>{currentOrders}</Text>
              <Text style={styles.targetLabel}>TRIPS</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, theme.input]} />
            <LinearGradient
              colors={["#34D399", "#10B981"]}
              style={[styles.progressBarFill, { width: `${dailyProgress}%` }]}
            />
            <View style={styles.milestonesRow}>
              {dailyMilestones.map((ms, i) => {
                const reached = currentOrders >= ms.t;
                return (
                  <View key={i} style={styles.milestone}>
                    <View style={[styles.milestoneDot, reached ? styles.milestoneDotReached : theme.card, { borderColor: reached ? "#fff" : isDark ? "#334155" : "#e2e8f0" }]}>
                      {reached && <Feather name="check" size={8} color="#fff" />}
                    </View>
                    <Text style={[styles.milestoneText, reached ? { color: "#10b981" } : theme.subText]}>{ms.t === 0 ? "Start" : ms.t}</Text>
                    {ms.r > 0 && <Text style={[styles.milestoneReward, reached ? theme.text : theme.subText]}>₹{ms.r}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* PROMO SLIDER */}
        <View style={styles.promoSlider}>
          {promoMedia.length > 0 && (
            <Image source={{ uri: promoMedia[currentSlide % promoMedia.length] }} style={styles.promoImg} resizeMode="cover" />
          )}
          <View style={styles.sliderDots}>
            {promoMedia.map((_, i) => (
              <View key={i} style={[styles.dot, currentSlide === i && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* PILOT PARTNER CARD */}
        <TouchableOpacity onPress={() => setShowPrimeModal(true)} activeOpacity={0.9}>
          <LinearGradient
            colors={
              isPrimePartner
                ? ["#38BDF8", "#0284C7", "#1D4ED8"]   // brand hero gradient — same as top banner
                : isDark
                  ? ["#1E293B", "#0F172A"]             // dark slate when offline/standard
                  : ["#334155", "#1E293B"]             // slate when standard (light mode)
            }
            style={styles.weeklyCard}
          >
            {/* Header row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="award" size={22} color="#fff" />
                <View>
                  <Text style={styles.weeklyTitle}>Pilot Partner Status</Text>
                  <Text style={styles.weeklySub}>
                    {isPrimePartner ? "Active Pilot this week 🎖️" : "Hit both targets to become Pilot"}
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>
                  {isPrimePartner ? "PILOT" : "STANDARD"}
                </Text>
              </View>
            </View>

            {/* Task 1 — Login Hours */}
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {loginReached
                    ? <Feather name="check-circle" size={11} color="#4ADE80" />
                    : <Feather name="wifi" size={11} color="rgba(255,255,255,0.85)" />}
                  <Text style={[styles.weeklySub, { marginBottom: 0 }]}>Login Hours</Text>
                </View>
                <Text style={{ color: loginReached ? "#4ADE80" : "#fff", fontSize: 11, fontWeight: "900" }}>
                  {loginHoursWeekly.toFixed(1)} / 38 hrs
                </Text>
              </View>
              <View style={styles.weeklyBarBg}>
                <View style={[styles.weeklyBarFill, {
                  width: `${Math.min(100, (loginHoursWeekly / 38) * 100)}%`,
                  backgroundColor: loginReached ? "#4ADE80" : "#fff",
                }]} />
              </View>
            </View>

            {/* Task 2 — Completion Score */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {scoreReached
                    ? <Feather name="check-circle" size={11} color="#4ADE80" />
                    : <Feather name="trending-up" size={11} color="rgba(255,255,255,0.85)" />}
                  <Text style={[styles.weeklySub, { marginBottom: 0 }]}>Completion Score</Text>
                </View>
                <Text style={{ color: scoreReached ? "#4ADE80" : "#fff", fontSize: 11, fontWeight: "900" }}>
                  {completionScore} / 65
                </Text>
              </View>
              <View style={styles.weeklyBarBg}>
                <View style={[styles.weeklyBarFill, {
                  width: `${Math.min(100, (completionScore / 65) * 100)}%`,
                  backgroundColor: scoreReached ? "#4ADE80" : "#fff",
                }]} />
              </View>
            </View>

            {/* Sub-text + tap hint */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.weeklyText, { flex: 1 }]}>
                {[loginReached, scoreReached].filter(Boolean).length}/2 tasks done
              </Text>
              <Text style={[styles.weeklyText, { opacity: 0.8 }]}>Tap for details →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── MODALS ─────────────────────────────────────────────────────── */}

      {/* Offline Confirmation */}
      <Modal visible={showOfflineConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.offlineModalContent, theme.card]}>
            <View style={styles.offlineIconBox}>
              <Feather name="power" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.offlineTitle, theme.text]}>Go Offline?</Text>
            <Text style={styles.offlineSub}>
              You will stop receiving new delivery requests and miss out on potential earnings today.
            </Text>
            <View style={{ width: "100%", gap: 12, marginTop: 24 }}>
              <TouchableOpacity onPress={() => setShowOfflineConfirm(false)} style={styles.stayOnlineBtn}>
                <Text style={styles.stayOnlineText}>Stay Online</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmGoOffline} style={styles.goOfflineBtn}>
                <Text style={styles.goOfflineText}>Yes, Go Offline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.langModalContent, theme.card]}>
            <Text style={[styles.langModalTitle, theme.text]}>Select Language</Text>
            {["en", "ta", "hi"].map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => { setCurrentLang(lang); setShowLangModal(false); }}
                style={[styles.langBtn, theme.input]}
              >
                <Text style={[styles.langBtnText, theme.text]}>
                  {lang === "en" ? "English 🇺🇸" : lang === "ta" ? "தமிழ் 🇮🇳" : "हिंदी 🇮🇳"}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLangModal(false)} style={{ marginTop: 16 }}>
              <Text style={theme.subText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.notifOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowNotifications(false)} />
          <View style={[styles.notifPanel, theme.card]}>
            <View style={[styles.notifHeader, { borderBottomColor: isDark ? "#334155" : "#E2E8F0" }]}>
              <Text style={[styles.notifTitle, theme.text]}>Alerts & Offers</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {alerts.length === 0 ? (
                <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 20 }}>No notifications yet</Text>
              ) : (
                alerts.map((a: any, idx: number) => (
                  <View key={a.id || idx} style={[styles.alertBox, theme.input, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
                    <View style={styles.alertIcon}><Feather name="gift" size={18} color="#D97706" /></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.alertTitle, theme.text]}>{a.title}</Text>
                      <Text style={styles.alertSub}>{a.message}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Order Popup */}
      {ringingOrder && (
        <NewOrderPopup
          order={ringingOrder}
          isPrime={isPrimePartner}
          onAccept={acceptOrder}
          onDecline={() => setRingingOrder(null)}
        />
      )}

      {/* Prime Partner View */}
      <PrimePartnerView
        isOpen={showPrimeModal}
        onClose={() => setShowPrimeModal(false)}
        weeklyOrders={weeklyOrders}
        weeklyAccepted={weeklyAccepted}
        weeklyCompleted={weeklyCompleted}
        weeklyLoginHours={parseFloat((loginSeconds / 3600).toFixed(1))}
        isPilotThisWeek={isPrimePartner}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — identical to original
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  header: { height: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", transform: [{ rotate: "3deg" }] },
  logoText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  greetingText: { fontSize: 14, fontWeight: "bold" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  statusText: { fontSize: 10, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  toggleSwitch: { width: 60, height: 34, borderRadius: 17, justifyContent: "center", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
  toggleLabels: { position: "absolute", width: "100%", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  toggleLabelText: { fontSize: 9, fontWeight: "900", color: "#FFF" },
  toggleKnob: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: "0px 1px 3px rgba(0,0,0,0.2)" },

  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  themeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  langBadge: { position: "absolute", bottom: -2, right: -2, backgroundColor: "#0284c7", paddingHorizontal: 4, borderRadius: 8 },
  langBadgeText: { color: "#fff", fontSize: 8, fontWeight: "bold", textTransform: "uppercase" },
  notifBadge: { position: "absolute", top: -2, right: -2, backgroundColor: "#EF4444", width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },

  heroCard: { width: "100%", height: 200, borderRadius: 24, overflow: "hidden", marginBottom: 20, elevation: 5, boxShadow: "0px 5px 10px rgba(2,132,199,0.3)" },
  celestial: { position: "absolute", right: 16, top: 16 },
  heroStats: { position: "absolute", top: 16, left: 16 },
  heroStatsLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  heroStatsValue: { color: "#fff", fontSize: 36, fontWeight: "900" },
  heroTripsBadge: { position: "absolute", right: 16, top: 60, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  heroTripsText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  roadContainer: { position: "absolute", bottom: 0, width: "100%", height: 50, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", overflow: "hidden" },
  roadLine: { width: "200%", height: 0, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderStyle: "dashed" },
  nativeTruck: { position: "absolute", bottom: 15, left: 25 },
  truckTrailer: { width: 70, height: 45, backgroundColor: "#F8FAFC", borderTopLeftRadius: 8, borderTopRightRadius: 2, borderBottomWidth: 5, borderBottomColor: "#CBD5E1", justifyContent: "center", alignItems: "center" },
  trailerStripe: { position: "absolute", top: 15, width: "100%", height: 8, backgroundColor: "#0284C7" },
  trailerText: { fontSize: 7, fontWeight: "900", color: "#FFF", zIndex: 10, marginTop: 4 },
  truckCab: { width: 25, height: 35, backgroundColor: "#CBD5E1", borderTopRightRadius: 8, borderBottomRightRadius: 4 },
  truckWindow: { width: 12, height: 14, backgroundColor: "#334155", marginTop: 4, marginLeft: 10, borderTopRightRadius: 4, borderBottomLeftRadius: 2 },
  truckWheel: { position: "absolute", bottom: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#1E293B", borderWidth: 2, borderColor: "#FFF", justifyContent: "center", alignItems: "center" },
  wheelRim: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#94A3B8" },

  // ── Hours badges inside hero card ───────────────────────────
  heroHoursRow: { flexDirection: "row", marginTop: 10 },
  heroHoursBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  heroHoursDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  heroHoursLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.75)", marginRight: 5, textTransform: "uppercase" },
  heroHoursValue: { fontSize: 13, fontWeight: "900", color: "#ffffff", letterSpacing: 0.5 },

  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, elevation: 2, boxShadow: "0px 2px 5px rgba(0,0,0,0.05)" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  targetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  targetCount: { fontSize: 24, fontWeight: "900", color: "#10b981" },
  targetLabel: { fontSize: 10, fontWeight: "bold", color: "#94a3b8" },
  progressContainer: { position: "relative", paddingTop: 10, paddingBottom: 10 },
  progressBarBg: { position: "absolute", top: 20, left: 10, right: 10, height: 6, borderRadius: 3 },
  progressBarFill: { position: "absolute", top: 20, left: 10, height: 6, borderRadius: 3 },
  milestonesRow: { flexDirection: "row", justifyContent: "space-between" },
  milestone: { alignItems: "center", zIndex: 10 },
  milestoneDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  milestoneDotReached: { backgroundColor: "#10b981", borderColor: "#fff" },
  milestoneText: { fontSize: 10, fontWeight: "bold", marginTop: 8 },
  milestoneReward: { fontSize: 10, fontWeight: "900" },

  promoSlider: { width: "100%", height: 180, borderRadius: 24, overflow: "hidden", marginBottom: 20 },
  promoImg: { width: "100%", height: "100%" },
  sliderDots: { position: "absolute", bottom: 12, width: "100%", flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 24, backgroundColor: "#fff" },

  weeklyCard: { padding: 20, borderRadius: 24, marginBottom: 20, elevation: 5, boxShadow: '0px 5px 10px rgba(2,132,199,0.25)' },
  weeklyTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  weeklySub: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  weeklyBarBg: { height: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 5, marginBottom: 12 },
  weeklyBarFill: { height: "100%", backgroundColor: "#fff", borderRadius: 5 },
  weeklyText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  offlineModalContent: { width: "85%", maxWidth: 360, padding: 24, borderRadius: 32, alignItems: "center", elevation: 15, boxShadow: "0px 8px 20px rgba(0,0,0,0.25)" },
  offlineIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  offlineTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  offlineSub: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22 },
  stayOnlineBtn: { width: "100%", backgroundColor: "#0284C7", paddingVertical: 16, borderRadius: 16, alignItems: "center", elevation: 5, boxShadow: "0px 5px 10px rgba(2,132,199,0.3)" },
  stayOnlineText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  goOfflineBtn: { width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center", borderWidth: 2, borderColor: "#FECACA" },
  goOfflineText: { color: "#EF4444", fontWeight: "bold", fontSize: 16 },

  langModalContent: { width: "85%", padding: 24, borderRadius: 24, alignItems: "center" },
  langModalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  langBtn: { width: "100%", padding: 16, borderRadius: 16, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  langBtnText: { fontSize: 16, fontWeight: "bold" },

  notifOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "flex-end", paddingTop: Platform.OS === "ios" ? 50 : 20 },
  notifPanel: { width: "85%", maxWidth: 360, height: "100%", borderTopLeftRadius: 24, borderBottomLeftRadius: 24, elevation: 10, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  notifTitle: { fontSize: 18, fontWeight: "bold" },
  alertBox: { flexDirection: "row", padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  alertTitle: { fontSize: 14, fontWeight: "bold" },
  alertSub: { fontSize: 12, color: "#64748B", marginTop: 4 },

  modalOverlayRight: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "row", justifyContent: "flex-end" },
  drawerContent: { width: "85%", maxWidth: 400, height: "100%", backgroundColor: "#fff", borderTopLeftRadius: 32, borderBottomLeftRadius: 32, padding: 24, paddingTop: Platform.OS === "ios" ? 50 : 24, elevation: 20, boxShadow: "0px 10px 20px rgba(0,0,0,0.3)" },
  closeBtn: { position: "absolute", top: Platform.OS === "ios" ? 50 : 24, right: 24, zIndex: 10, width: 40, height: 40, backgroundColor: "#F1F5F9", borderRadius: 20, alignItems: "center", justifyContent: "center" },

  loadingView: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#64748B", fontWeight: "bold", marginTop: 16 },

  popupHeader: { alignItems: "center", marginBottom: 20, marginTop: 20 },
  orderIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16, elevation: 5, boxShadow: "0px 5px 10px rgba(2,132,199,0.4)" },
  orderPopupTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginBottom: 8 },

  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statusLabelText: { fontSize: 14, color: "#64748B" },
  primeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginLeft: 8, elevation: 3, boxShadow: "0px 2px 5px rgba(245,158,11,0.3)" },
  primeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  normalBadge: { backgroundColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  normalBadgeText: { color: "#475569", fontSize: 12, fontWeight: "bold" },

  waitBoxAmber: { backgroundColor: "#FFFBEB", padding: 12, borderRadius: 12, width: "100%", alignItems: "center", marginBottom: 8, borderWidth: 2, borderColor: "#FDE68A" },
  waitBoxTitleAmber: { color: "#B45309", fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  waitBoxTextAmber: { color: "#D97706", fontSize: 12 },
  waitBoxGreen: { backgroundColor: "#F0FDF4", padding: 12, borderRadius: 12, width: "100%", alignItems: "center", marginBottom: 8, borderWidth: 2, borderColor: "#BBF7D0" },
  waitBoxTitleGreen: { color: "#16A34A", fontWeight: "bold", fontSize: 14 },

  orderDetailsCard: { backgroundColor: "#F8FAFC", padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: "#E2E8F0" },
  orderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  orderType: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  orderDistance: { fontSize: 14, color: "#64748B" },
  orderPayout: { fontSize: 28, fontWeight: "900", color: "#16A34A" },
  orderPaymentType: { fontSize: 10, fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase" },

  locationRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  pickupDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 },
  dropDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 },
  locationLabel: { fontSize: 10, fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 },
  locationText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  declineBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: "#FECACA", alignItems: "center", flexDirection: "row", justifyContent: "center", backgroundColor: "#FFF" },
  declineText: { color: "#DC2626", fontWeight: "bold", fontSize: 16 },
  acceptBtn: { paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", elevation: 5, boxShadow: "0px 5px 10px rgba(34,197,94,0.4)" },
  acceptText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

const lightTheme = StyleSheet.create({
  container: { backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#ffffff", borderBottomColor: "#e2e8f0" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0" },
  input: { backgroundColor: "#f1f5f9" },
  text: { color: "#0f172a" },
  subText: { color: "#64748b" },
});
const darkTheme = StyleSheet.create({
  container: { backgroundColor: "#0f172a" },
  header: { backgroundColor: "#1e293b", borderBottomColor: "#334155" },
  card: { backgroundColor: "#1e293b", borderColor: "#334155" },
  input: { backgroundColor: "#0f172a" },
  text: { color: "#f8fafc" },
  subText: { color: "#94a3b8" },
});
