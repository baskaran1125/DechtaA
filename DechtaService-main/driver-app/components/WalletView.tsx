// components/WalletView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Animated, Dimensions, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { WalletAPI } from '../services/api';

const { width } = Dimensions.get('window');
const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TX_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  credit:     { icon: 'arrow-down-left', color: '#059669', bg: '#ECFDF5', label: 'Earned'     },
  debit:      { icon: 'arrow-up-right',  color: '#DC2626', bg: '#FEF2F2', label: 'Paid Out'   },
  commission: { icon: 'percent',         color: '#D97706', bg: '#FFFBEB', label: 'Commission' },
  withdrawal: { icon: 'send',            color: '#7C3AED', bg: '#F5F3FF', label: 'Withdrawal' },
};
const txMeta = (desc: string, type: string) => {
  const d = (desc || '').toLowerCase();
  if (d.includes('withdraw') || d.includes('bank')) return TX_META.withdrawal;
  if (d.includes('commission') || d.includes('dues')) return TX_META.commission;
  return type === 'credit' ? TX_META.credit : TX_META.debit;
};

// ── Animated fill bar ─────────────────────────────────────────
function FillBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View style={{ height, backgroundColor: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
      <Animated.View style={{
        height: '100%', borderRadius: 99, backgroundColor: color,
        width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any,
      }} />
    </View>
  );
}

// ── Animated number ───────────────────────────────────────────
function CountUp({ to, style }: { to: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [val, setVal] = useState(0);
  useEffect(() => {
    Animated.timing(anim, { toValue: to, duration: 800, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setVal(Math.round(v)));
    return () => anim.removeListener(id);
  }, [anim, to]);
  return <Text style={style}>₹{val.toLocaleString('en-IN')}</Text>;
}

// ── Collapsible section ───────────────────────────────────────
function Collapsible({ title, badge, defaultOpen = true, children }: {
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rot = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const toggle = () => {
    setOpen(o => !o);
    Animated.timing(rot, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
  };
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <View style={co.wrap}>
      <TouchableOpacity onPress={toggle} style={co.header} activeOpacity={0.7}>
        <Text style={co.title}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {badge ? <View style={co.badge}><Text style={co.badgeTxt}>{badge}</Text></View> : null}
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Feather name="chevron-down" size={16} color="#94A3B8" />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {open && <View style={co.body}>{children}</View>}
    </View>
  );
}
const co = StyleSheet.create({
  wrap:     { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title:    { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  body:     { paddingHorizontal: 16, paddingBottom: 16 },
  badge:    { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: '#64748B' },
});

// ── Bottom sheet ──────────────────────────────────────────────
function Sheet({ visible, onClose, children, loading }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; loading?: boolean;
}) {
  const y = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    Animated.spring(y, { toValue: visible ? 0 : 600, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
  }, [visible, y]);
  if (!visible) return null;
  return (
    <Modal transparent statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => !loading && onClose()} />
        <Animated.View style={[sh.panel, { transform: [{ translateY: y }] }]}>
          <View style={sh.handle} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const sh = StyleSheet.create({
  panel:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 99, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
});

// ── Sheet header ──────────────────────────────────────────────
function SheetHead({ icon, iconBg, iconColor, title, sub, onClose }: {
  icon: string; iconBg: string; iconColor: string; title: string; sub?: string; onClose: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
      <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <Feather name="x" size={15} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

// ── Big amount field ──────────────────────────────────────────
function BigField({ value, onChange, placeholder = '0' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderColor: '#E2E8F0', paddingBottom: 6, marginBottom: 16 }}>
      <Text style={{ fontSize: 26, color: '#CBD5E1', fontWeight: '700', marginRight: 4 }}>₹</Text>
      <TextInput
        style={{ flex: 1, fontSize: 40, fontWeight: '800', color: '#0F172A', paddingVertical: 6 }}
        value={value} onChangeText={onChange}
        keyboardType="numeric" placeholder={placeholder} placeholderTextColor="#E2E8F0"
        autoFocus
      />
    </View>
  );
}

// ── Quick chips ───────────────────────────────────────────────
function Chips({ list, selected, onSelect }: { list: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
      {list.map(a => (
        <TouchableOpacity key={a} onPress={() => onSelect(a)} activeOpacity={0.8}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
            backgroundColor: selected === a ? '#EFF6FF' : '#F8FAFC',
            borderWidth: 1.5, borderColor: selected === a ? '#3B82F6' : '#E8ECEF' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: selected === a ? '#2563EB' : '#64748B' }}>₹{a}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Action button ─────────────────────────────────────────────
function ActionBtn({ label, color, onPress, loading, disabled, icon }: {
  label: string; color: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading || disabled} activeOpacity={0.85}
      style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: color, marginBottom: 10, opacity: (loading || disabled) ? 0.5 : 1,
        flexDirection: 'row', gap: 8 }}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : (
        <>
          {icon ? <Feather name={icon as any} size={17} color="#fff" /> : null}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function WalletView({ onClose }: { onClose: () => void }) {

  // ── state (unchanged) ─────────────────────────────────────────
  const [walletBalance,   setWalletBalance]   = useState(0);
  const [outstandingDues, setOutstandingDues] = useState(0);
  const [duesLimit,       setDuesLimit]       = useState(300);
  const [transactions,    setTransactions]    = useState<any[]>([]);
  const [todayEarned,     setTodayEarned]     = useState(0);
  const [totalTrips,      setTotalTrips]      = useState(0);
  const [loadingWallet,   setLoadingWallet]   = useState(true);

  const [commRatePct,    setCommRatePct]    = useState(10);
  const [weeklyGross,    setWeeklyGross]    = useState(0);
  const [weeklyDeducted, setWeeklyDeducted] = useState(0);
  const [weeklyNet,      setWeeklyNet]      = useState(0);
  const [weeklyOrders,   setWeeklyOrders]   = useState(0);
  const [totalGross,     setTotalGross]     = useState(0);
  const [totalDeducted,  setTotalDeducted]  = useState(0);
  const [totalNet,       setTotalNet]       = useState(0);
  const [commTab,        setCommTab]        = useState<'week' | 'alltime'>('week');

  const [isLoading,      setIsLoading]      = useState(false);
  const [payAmount,      setPayAmount]      = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [topupAmount,    setTopupAmount]    = useState('');
  const [upiId,          setUpiId]          = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState<'upi' | 'card'>('upi');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isPayDuesOpen,  setIsPayDuesOpen]  = useState(false);
  const [txFilter,       setTxFilter]       = useState<'all'|'credit'|'commission'|'withdrawal'>('all');
  const [balanceHidden,  setBalanceHidden]  = useState(false);
  const paymentSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (paymentSuccessTimerRef.current) {
        clearTimeout(paymentSuccessTimerRef.current);
      }
    };
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  // ── load (unchanged) ──────────────────────────────────────────
  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const result = await WalletAPI.get();
      if (result.success && result.data) {
        const d = result.data;
        setWalletBalance(parseFloat(d.balance || d.wallet_balance || 0));
        setOutstandingDues(parseFloat(d.outstandingDues || d.outstanding_dues || 0));
        setDuesLimit(parseFloat(d.duesLimit || 300));
        const c = d.commission || {};
        setCommRatePct(parseFloat(c.ratePct || 10));
        setWeeklyGross(parseFloat(c.weeklyGross || 0));
        setWeeklyDeducted(parseFloat(c.weeklyDeducted || 0));
        setWeeklyNet(parseFloat(c.weeklyNet || 0));
        setWeeklyOrders(parseInt(c.weeklyOrders || 0, 10));
        setTotalGross(parseFloat(c.totalGross || 0));
        setTotalDeducted(parseFloat(c.totalDeducted || 0));
        setTotalNet(parseFloat(c.totalNet || 0));
        const txList = (d.transactions || []).map((t: any) => ({
          id: t.id, type: t.type || 'credit', amount: parseFloat(t.amount || 0),
          date: t.date || t.created_at
            ? new Date(t.date || t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '—',
          desc: t.description || t.type || 'Transaction',
        }));
        setTransactions(txList);
        const today = new Date().toDateString();
        const te = txList.filter((t: any) => t.type === 'credit' && new Date(t.date).toDateString() === today)
          .reduce((a: number, b: any) => a + b.amount, 0);
        setTodayEarned(te || parseFloat(d.todayEarnings || d.today_earnings || 0));
        setTotalTrips(parseInt(d.totalTrips || d.total_trips || 0, 10));
      }
    } catch {}
    finally { setLoadingWallet(false); }
  }, []);
  useEffect(() => { loadWallet(); }, [loadWallet]);

  // ── derived (unchanged) ───────────────────────────────────────
  const isLimitReached = outstandingDues >= duesLimit;
  const duesPct        = Math.min((outstandingDues / duesLimit) * 100, 100);
  const duesBarColor   = isLimitReached ? '#EF4444' : duesPct > 70 ? '#F59E0B' : '#10B981';
  const filteredTx     = txFilter === 'all' ? transactions : transactions.filter(t => t.type === txFilter);
  const commGross      = commTab === 'week' ? weeklyGross    : totalGross;
  const commDeducted   = commTab === 'week' ? weeklyDeducted : totalDeducted;
  const commNet        = commTab === 'week' ? weeklyNet      : totalNet;
  const commNetPct     = commGross > 0 ? Math.round(commNet / commGross * 100) : 100 - commRatePct;

  // Payment handlers with real-time Cashfree status checks
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForPaymentConfirmation = async (orderId: string) => {
    const maxAttempts = 40; // ~2 minutes with 3s interval
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusRes = await WalletAPI.getOrderStatus(orderId);
        const status = String(statusRes?.status || '').toUpperCase();
        if (status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED') {
          return status;
        }
      } catch {}
      await sleep(3000);
    }
    return 'PENDING';
  };

  const handlePayDues = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return Alert.alert('Error', 'Enter a valid amount.');
    if (outstandingDues <= 0) return Alert.alert('Notice', 'No outstanding dues.');
    if (amt > outstandingDues) return Alert.alert('Error', 'Amount exceeds outstanding dues.');

    setIsLoading(true);
    try {
      const res = await WalletAPI.payDues(amt);
      if (!res.success) {
        Alert.alert('Failed', res.message || 'Payment could not be started.');
        return;
      }

      if (!res.order_id || !res.payment_link) {
        Alert.alert('Failed', 'Payment link was not generated. Please retry.');
        return;
      }

      await Linking.openURL(res.payment_link).catch(() => {
        throw new Error('Unable to open payment page.');
      });

      Alert.alert('Payment Started', 'Complete payment in Cashfree and return to the app.');
      const finalStatus = await waitForPaymentConfirmation(res.order_id);

      if (finalStatus === 'SUCCESS') {
        await loadWallet();
        setIsPayDuesOpen(false);
        setPayAmount('');
        Alert.alert('Success', 'Commission dues paid successfully.');
      } else if (finalStatus === 'FAILED' || finalStatus === 'CANCELLED') {
        Alert.alert('Payment Failed', 'The dues payment was not completed.');
      } else {
        Alert.alert('Payment Pending', 'Confirmation is pending. Tap refresh after a short wait.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount || '0');
    if (!amt || amt < 500) return Alert.alert('Min INR 500', 'Minimum withdrawal is INR 500.');
    if (amt > walletBalance) return Alert.alert('Low Balance', 'Insufficient balance.');
    if (!upiId.trim()) return Alert.alert('UPI Required', 'Enter your UPI ID.');
    setIsLoading(true);
    try {
      const res = await WalletAPI.withdraw(amt, upiId.trim());
      if (res.success) {
        await loadWallet();
        setIsWithdrawOpen(false);
        setWithdrawAmount('');
        setUpiId('');
        Alert.alert('Initiated', `INR ${amt.toLocaleString('en-IN')} withdrawal is being processed.`);
      } else Alert.alert('Failed', res.message || 'Try again.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMoney = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 1) return Alert.alert('Invalid Amount', 'Enter a valid amount.');

    setIsLoading(true);
    try {
      const res = await WalletAPI.addMoney(amt);
      if (!res.success) {
        Alert.alert('Failed', res.message || 'Payment could not be started.');
        return;
      }

      if (!res.order_id || !res.payment_link) {
        Alert.alert('Failed', 'Payment link was not generated. Please retry.');
        return;
      }

      await Linking.openURL(res.payment_link).catch(() => {
        throw new Error('Unable to open payment page.');
      });

      Alert.alert('Payment Started', 'Complete payment in Cashfree and return to the app.');
      const finalStatus = await waitForPaymentConfirmation(res.order_id);

      if (finalStatus === 'SUCCESS') {
        await loadWallet();
        setPaymentSuccess(true);
        if (paymentSuccessTimerRef.current) {
          clearTimeout(paymentSuccessTimerRef.current);
        }
        paymentSuccessTimerRef.current = setTimeout(() => {
          setIsAddMoneyOpen(false);
          setPaymentSuccess(false);
          setTopupAmount('');
          paymentSuccessTimerRef.current = null;
        }, 2500);
      } else if (finalStatus === 'FAILED' || finalStatus === 'CANCELLED') {
        Alert.alert('Payment Failed', 'Money was not added to wallet.');
      } else {
        Alert.alert('Payment Pending', 'Confirmation is pending. Tap refresh after a short wait.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>

      {/* HEADER */}
      <SafeAreaView style={{ backgroundColor: '#fff' }}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.hBtn}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={s.hTitle}>My Wallet</Text>
          <TouchableOpacity onPress={loadWallet} style={s.hBtn}>
            <Feather name="refresh-cw" size={17} color="#64748B" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── BALANCE CARD ───────────────────────────────────────── */}
        <LinearGradient colors={['#1A3558', '#0D2240']} style={s.card0}>
          {/* balance row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginBottom: 8 }}>
                WALLET BALANCE
              </Text>
              {loadingWallet
                ? <View style={{ width: 170, height: 42, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
                : balanceHidden
                  ? <Text style={s.balAmt}>₹ • • • • •</Text>
                  : <CountUp to={walletBalance} style={s.balAmt} />
              }
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' }} />
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setBalanceHidden(v => !v)}
              style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 }}>
              <Feather name={balanceHidden ? 'eye-off' : 'eye'} size={17} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* today + trips row */}
          <View style={s.infoRow}>
            <View style={s.infoItem}>
              <Text style={s.infoLbl}>Today&apos;s earnings</Text>
              <Text style={s.infoVal}>{loadingWallet ? '—' : fmt(todayEarned)}</Text>
            </View>
            <View style={s.infoSep} />
            <View style={s.infoItem}>
              <Text style={s.infoLbl}>Total trips</Text>
              <Text style={s.infoVal}>{totalTrips}</Text>
            </View>
            <View style={s.infoSep} />
            <View style={s.infoItem}>
              <Text style={s.infoLbl}>Week commission</Text>
              <Text style={[s.infoVal, { color: '#FCD34D' }]}>{fmt(weeklyDeducted)}</Text>
            </View>
          </View>

          {/* 3 action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity onPress={() => setIsAddMoneyOpen(true)} style={s.actionBtn} activeOpacity={0.8}>
              <View style={[s.actionIconBox, { backgroundColor: 'rgba(59,130,246,0.25)' }]}>
                <Feather name="plus" size={18} color="#93C5FD" />
              </View>
              <Text style={s.actionLbl}>Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsWithdrawOpen(true)} style={s.actionBtn} activeOpacity={0.8}>
              <View style={[s.actionIconBox, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                <Feather name="arrow-up-right" size={18} color="#FCA5A5" />
              </View>
              <Text style={s.actionLbl}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setPayAmount(Math.ceil(outstandingDues).toString()); setIsPayDuesOpen(true); }}
              style={s.actionBtn} activeOpacity={0.8}
            >
              <View style={[s.actionIconBox, { backgroundColor: isLimitReached ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)' }]}>
                <Feather name="check-circle" size={18} color={isLimitReached ? '#FCA5A5' : '#FCD34D'} />
              </View>
              <Text style={s.actionLbl}>Pay Dues</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── DUES (only when > 0) ────────────────────────────────── */}
        {outstandingDues > 0 && (
          <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: duesBarColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Feather name={isLimitReached ? 'lock' : 'alert-circle'} size={18} color={duesBarColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  {isLimitReached ? 'Account Suspended' : 'Commission Dues Pending'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {isLimitReached ? 'Pay now to reactivate' : `Stay below ${fmt(duesLimit)} to stay active`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: duesBarColor }}>{fmt(outstandingDues)}</Text>
                <TouchableOpacity
                  onPress={() => { setPayAmount(Math.ceil(outstandingDues).toString()); setIsPayDuesOpen(true); }}
                  style={{ marginTop: 4, backgroundColor: duesBarColor + '18', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: duesBarColor }}>Pay now</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FillBar pct={duesPct} color={duesBarColor} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: duesBarColor }}>{Math.round(duesPct)}% of limit</Text>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>Limit {fmt(duesLimit)}</Text>
            </View>
          </View>
        )}

        {/* ── THIS WEEK ──────────────────────────────────────────── */}
        <Collapsible title="This Week" badge={loadingWallet ? '…' : `${weeklyOrders} trips`}>
          <View style={s.statRow}>
            {[
              { lbl: 'Gross Earned',  val: weeklyGross,    color: '#2563EB', icon: 'trending-up' },
              { lbl: 'Net Payout',    val: weeklyNet,      color: '#059669', icon: 'dollar-sign' },
              { lbl: 'Commission',    val: weeklyDeducted, color: '#D97706', icon: 'percent'     },
              { lbl: 'Deliveries',    val: weeklyOrders,   color: '#7C3AED', icon: 'package', isNum: true },
            ].map((stat, i) => (
              <View key={i} style={s.statBox}>
                <View style={[s.statIconBox, { backgroundColor: stat.color + '15' }]}>
                  <Feather name={stat.icon as any} size={14} color={stat.color} />
                </View>
                {loadingWallet
                  ? <View style={{ width: 60, height: 18, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 4 }} />
                  : <Text style={[s.statVal, { color: stat.color }]}>
                      {(stat as any).isNum ? String(stat.val) : fmt(stat.val as number)}
                    </Text>
                }
                <Text style={s.statLbl}>{stat.lbl}</Text>
              </View>
            ))}
          </View>
          {weeklyOrders > 0 && !loadingWallet && (
            <View style={s.avgStrip}>
              {[
                { l: 'Avg gross / trip', v: fmt(Math.round(weeklyGross    / weeklyOrders)) },
                { l: 'Avg net / trip',   v: fmt(Math.round(weeklyNet      / weeklyOrders)) },
                { l: 'Avg comm / trip',  v: fmt(Math.round(weeklyDeducted / weeklyOrders)) },
              ].map((a, i) => (
                <View key={i} style={[s.avgItem, i < 2 && { borderRightWidth: 1, borderRightColor: '#E2E8F0' }]}>
                  <Text style={s.avgVal}>{a.v}</Text>
                  <Text style={s.avgLbl}>{a.l}</Text>
                </View>
              ))}
            </View>
          )}
        </Collapsible>

        {/* ── COMMISSION BREAKDOWN ───────────────────────────────── */}
        <Collapsible title="Commission Breakdown" badge={`${commRatePct}% rate`}>
          {/* week / all time toggle */}
          <View style={s.segWrap}>
            {(['week', 'alltime'] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setCommTab(t)}
                style={[s.segBtn, commTab === t && s.segBtnOn]}>
                <Text style={[s.segTxt, commTab === t && s.segTxtOn]}>
                  {t === 'week' ? 'This week' : 'All time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* gross → commission → net */}
          <View style={s.commCalc}>
            <View style={s.commBox}>
              <Text style={s.commBoxLbl}>GROSS</Text>
              <Text style={[s.commBoxVal, { color: '#1E40AF' }]}>{fmt(commGross)}</Text>
              <Text style={s.commBoxSub}>Total fees</Text>
            </View>
            <Feather name="minus" size={16} color="#CBD5E1" />
            <View style={s.commBox}>
              <Text style={s.commBoxLbl}>COMMISSION</Text>
              <Text style={[s.commBoxVal, { color: '#DC2626' }]}>{fmt(commDeducted)}</Text>
              <Text style={s.commBoxSub}>{commRatePct}% deducted</Text>
            </View>
            <Feather name="pause" size={16} color="#CBD5E1" style={{ transform: [{ rotate: '90deg' }] }} />
            <View style={[s.commBox, { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 8 }]}>
              <Text style={[s.commBoxLbl, { color: '#065F46' }]}>YOUR PAYOUT</Text>
              <Text style={[s.commBoxVal, { color: '#059669', fontSize: 16 }]}>{fmt(commNet)}</Text>
              <Text style={[s.commBoxSub, { color: '#10B981' }]}>To wallet</Text>
            </View>
          </View>

          {/* proportion bar */}
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: '#F1F5F9', marginTop: 14, marginBottom: 8 }}>
            {commGross > 0 ? (
              <>
                <View style={{ flex: commNet,      backgroundColor: '#10B981', borderRadius: 99 }} />
                <View style={{ width: 2 }} />
                <View style={{ flex: commDeducted, backgroundColor: '#FCD34D', borderRadius: 99 }} />
              </>
            ) : (
              <View style={{ flex: 1, backgroundColor: '#E2E8F0', borderRadius: 99 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Net payout ({commNetPct}%)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' }} />
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Commission ({commRatePct}%)</Text>
            </View>
          </View>

          {/* formula note */}
          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 12 }}>
            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', textAlign: 'center' }}>
              Net = Gross − {commRatePct}%  ·  Example: ₹100 trip → ₹{100 - commRatePct} to you + ₹{commRatePct} platform
            </Text>
          </View>
        </Collapsible>

        {/* ── TRANSACTIONS ───────────────────────────────────────── */}
        <Collapsible title="Transactions" defaultOpen>
          {/* filter row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {([
              { k: 'all',        l: 'All'         },
              { k: 'credit',     l: 'Earnings'    },
              { k: 'commission', l: 'Commission'  },
              { k: 'withdrawal', l: 'Withdrawals' },
            ] as const).map(({ k, l }) => (
              <TouchableOpacity key={k} onPress={() => setTxFilter(k)}
                style={[s.chip, txFilter === k && s.chipOn]}>
                <Text style={[s.chipTxt, txFilter === k && s.chipTxtOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingWallet ? (
            <View style={{ gap: 14 }}>
              {[0,1,2].map(i => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#F1F5F9' }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ width: '55%', height: 12, backgroundColor: '#F1F5F9', borderRadius: 4 }} />
                    <View style={{ width: '35%', height: 10, backgroundColor: '#F1F5F9', borderRadius: 4 }} />
                  </View>
                  <View style={{ width: 55, height: 14, backgroundColor: '#F1F5F9', borderRadius: 4 }} />
                </View>
              ))}
            </View>
          ) : filteredTx.length === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: 'center', gap: 8 }}>
              <Feather name="inbox" size={30} color="#CBD5E1" />
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>No transactions</Text>
              <Text style={{ fontSize: 12, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 20 }}>
                {txFilter === 'all' ? 'Complete a delivery to see entries.' : `No ${txFilter} entries yet.`}
              </Text>
            </View>
          ) : filteredTx.map((tx, idx) => {
            const meta   = txMeta(tx.desc, tx.type);
            const isPlus = tx.type === 'credit';
            const amtColor = tx.type === 'credit' ? '#059669' : tx.type === 'commission' ? '#D97706' : '#DC2626';
            return (
              <View key={tx.id || idx}
                style={[s.txRow, idx < filteredTx.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }]}>
                <View style={[s.txIconBox, { backgroundColor: meta.bg }]}>
                  <Feather name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.desc}</Text>
                  <Text style={s.txDate}>{tx.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[s.txAmt, { color: amtColor }]}>
                    {isPlus ? '+' : '−'}{fmt(tx.amount)}
                  </Text>
                  <View style={[s.txTag, { backgroundColor: meta.bg }]}>
                    <Text style={[s.txTagTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Collapsible>

      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          PAY DUES SHEET
      ══════════════════════════════════════════════════════ */}
      <Sheet visible={isPayDuesOpen} onClose={() => setIsPayDuesOpen(false)} loading={isLoading}>
        <SheetHead icon="check-circle" iconBg="#FFFBEB" iconColor="#D97706"
          title="Pay Commission Dues"
          sub={`Balance ${fmt(walletBalance)}  ·  Dues ${fmt(outstandingDues)}`}
          onClose={() => setIsPayDuesOpen(false)} />

        <FillBar pct={duesPct} color={duesBarColor} height={7} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: duesBarColor, fontWeight: '600' }}>{fmt(outstandingDues)} pending</Text>
          <Text style={{ fontSize: 11, color: '#94A3B8' }}>Limit {fmt(duesLimit)}</Text>
        </View>

        <Text style={s.iLbl}>AMOUNT TO PAY</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <BigField value={payAmount} onChange={setPayAmount} />
          </View>
          <TouchableOpacity onPress={() => setPayAmount(Math.ceil(outstandingDues).toString())}
            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', alignSelf: 'flex-start', marginTop: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Full</Text>
          </TouchableOpacity>
        </View>
        <Chips list={['50','100','200', Math.ceil(outstandingDues).toString()]} selected={payAmount} onSelect={setPayAmount} />
        <ActionBtn label="Confirm Payment" color="#D97706" onPress={handlePayDues} loading={isLoading} disabled={outstandingDues <= 0} icon="check-circle" />
        <TouchableOpacity onPress={() => setIsPayDuesOpen(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </Sheet>

      {/* ══════════════════════════════════════════════════════
          WITHDRAW SHEET
      ══════════════════════════════════════════════════════ */}
      <Sheet visible={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} loading={isLoading}>
        <SheetHead icon="arrow-up-right" iconBg="#FEF2F2" iconColor="#DC2626"
          title="Withdraw to Bank"
          sub={`Available ${fmt(walletBalance)}  ·  Min ₹500`}
          onClose={() => setIsWithdrawOpen(false)} />

        {outstandingDues > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Feather name="alert-triangle" size={13} color="#D97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' }}>
              {fmt(outstandingDues)} pending dues — clear them if balance is low.
            </Text>
          </View>
        )}

        <Text style={s.iLbl}>AMOUNT</Text>
        <BigField value={withdrawAmount} onChange={setWithdrawAmount} placeholder="500" />
        <Chips list={['500','1000','2000','5000']} selected={withdrawAmount} onSelect={setWithdrawAmount} />

        <Text style={s.iLbl}>UPI ID</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderColor: '#E2E8F0', paddingBottom: 10, marginBottom: 20 }}>
          <Feather name="smartphone" size={16} color="#94A3B8" />
          <TextInput style={{ flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '600' }}
            value={upiId} onChangeText={setUpiId}
            placeholder="yourname@upi" placeholderTextColor="#CBD5E1"
            autoCapitalize="none" keyboardType="email-address" />
        </View>

        <ActionBtn label={`Withdraw ${withdrawAmount ? fmt(parseFloat(withdrawAmount)) : '₹0'}`} color="#DC2626" onPress={handleWithdraw} loading={isLoading} icon="send" />
        <TouchableOpacity onPress={() => setIsWithdrawOpen(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </Sheet>

      {/* ══════════════════════════════════════════════════════
          ADD MONEY SHEET
      ══════════════════════════════════════════════════════ */}
      <Sheet visible={isAddMoneyOpen} onClose={() => { setIsAddMoneyOpen(false); setPaymentSuccess(false); }} loading={isLoading}>
        {paymentSuccess ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="check-circle" size={36} color="#059669" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A' }}>Money Added!</Text>
            <Text style={{ fontSize: 14, color: '#64748B' }}>{fmt(parseFloat(topupAmount || '0'))} added to your wallet</Text>
          </View>
        ) : (
          <>
            <SheetHead icon="plus-circle" iconBg="#EFF6FF" iconColor="#2563EB"
              title="Add Money"
              sub={`Current balance ${fmt(walletBalance)}`}
              onClose={() => setIsAddMoneyOpen(false)} />

            <Text style={s.iLbl}>AMOUNT</Text>
            <BigField value={topupAmount} onChange={setTopupAmount} />
            <Chips list={['500','1000','2000','5000']} selected={topupAmount} onSelect={setTopupAmount} />

            <Text style={s.iLbl}>PAY USING</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {([
                { k: 'upi',  icon: 'smartphone'  as const, lbl: 'UPI',  sub: 'GPay · PhonePe · Paytm' },
                { k: 'card', icon: 'credit-card'  as const, lbl: 'Card', sub: 'Debit / Credit Card'     },
              ]).map(m => (
                <TouchableOpacity key={m.k} onPress={() => setPaymentMethod(m.k as any)} activeOpacity={0.85}
                  style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5,
                    borderColor: paymentMethod === m.k ? '#3B82F6' : '#E2E8F0',
                    backgroundColor: paymentMethod === m.k ? '#EFF6FF' : '#FAFAFA',
                    alignItems: 'center', gap: 4, position: 'relative' }}>
                  <Feather name={m.icon} size={20} color={paymentMethod === m.k ? '#2563EB' : '#94A3B8'} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: paymentMethod === m.k ? '#2563EB' : '#64748B' }}>{m.lbl}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{m.sub}</Text>
                  {paymentMethod === m.k && (
                    <View style={{ position: 'absolute', top: 7, right: 7, width: 17, height: 17, borderRadius: 9, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <ActionBtn label={`Add ${topupAmount ? fmt(parseFloat(topupAmount)) : '₹0'} to Wallet`} color="#2563EB" onPress={handleAddMoney} loading={isLoading} icon="plus" />
            <TouchableOpacity onPress={() => setIsAddMoneyOpen(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </Sheet>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hBtn:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  hTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0F172A' },

  // balance card
  card0:      { margin: 16, borderRadius: 22, padding: 20, shadowColor: '#0D2240', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 10 },
  balAmt:     { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  infoRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, marginBottom: 16 },
  infoItem:   { flex: 1, alignItems: 'center' },
  infoSep:    { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 2 },
  infoLbl:    { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 4, textAlign: 'center' },
  infoVal:    { fontSize: 13, fontWeight: '800', color: '#fff' },
  actionRow:  { flexDirection: 'row', gap: 8 },
  actionBtn:  { flex: 1, alignItems: 'center', gap: 6 },
  actionIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionLbl:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  // card (white sections)
  card: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16 },

  // stats
  statRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 2 },
  statBox:    { width: (width - 64) / 2, gap: 6 },
  statIconBox:{ width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statVal:    { fontSize: 17, fontWeight: '900' },
  statLbl:    { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  // avg strip
  avgStrip:  { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, marginTop: 14, paddingVertical: 12 },
  avgItem:   { flex: 1, alignItems: 'center', paddingVertical: 2 },
  avgVal:    { fontSize: 13, fontWeight: '900', color: '#0F172A', marginBottom: 3 },
  avgLbl:    { fontSize: 10, color: '#64748B', fontWeight: '600', textAlign: 'center' },

  // commission
  segWrap:   { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 3, marginBottom: 16 },
  segBtn:    { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  segBtnOn:  { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  segTxt:    { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  segTxtOn:  { color: '#0F172A' },
  commCalc:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  commBox:   { flex: 1, alignItems: 'center' },
  commBoxLbl:{ fontSize: 8, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center' },
  commBoxVal:{ fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  commBoxSub:{ fontSize: 9, color: '#94A3B8', textAlign: 'center' },

  // filter chips
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipOn:     { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  chipTxt:    { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTxtOn:  { color: '#2563EB' },

  // transactions
  txRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  txIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txDesc:    { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  txDate:    { fontSize: 11, color: '#94A3B8' },
  txAmt:     { fontSize: 15, fontWeight: '900' },
  txTag:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txTagTxt:  { fontSize: 9, fontWeight: '800' },

  // sheet inputs
  iLbl: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 },
});
