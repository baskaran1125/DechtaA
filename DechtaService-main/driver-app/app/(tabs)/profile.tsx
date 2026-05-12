import React, { useState, useEffect } from 'react';
import WalletView from '../../components/WalletView';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  Modal, Dimensions, Image, Linking, Alert, ActivityIndicator, Platform, useColorScheme,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Polyline, Rect, Polygon } from 'react-native-svg';
import { DriverAPI, EarningsAPI, MiscAPI, AuthAPI, BASE_URL, resolveDocUrl } from '../../services/api';
import { openCamera, openGallery } from '../../utils/fileUpload';
import { isWeb } from '../../utils/platform';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// PURE NATIVE SVG ICONS
// ═══════════════════════════════════════════════════════════════════════════
function NativeIcon({ name, size = 24, color = "currentColor" }: { name: string, size?: number, color?: string }) {
  switch(name) {
    case 'award': return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Circle cx="12" cy="8" r="7"/><Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></Svg>;
    case 'crown': return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Polygon points="2 4 5 15 12 11 19 15 22 4 17 7 12 2 7 7 2 4"/><Path d="M2 17h20v5H2z" fill="currentColor"/></Svg>;
    case 'truck': return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Rect x="1" y="3" width="15" height="13"/><Polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><Circle cx="5.5" cy="18.5" r="2.5"/><Circle cx="18.5" cy="18.5" r="2.5"/></Svg>;
    case 'card': return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><Line x1="1" y1="10" x2="23" y2="10"/></Svg>;
    default: return <Feather name="help-circle" size={size} color={color} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RANK DEFINITIONS (static — same as backend)
// ═══════════════════════════════════════════════════════════════════════════
const ranks = [
  { id: 1, name: 'Trainee',              threshold: 0,  icon: 'user',  colorBg: '#F1F5F9', colorText: '#475569' },
  { id: 2, name: 'Second Officer',       threshold: 16, icon: 'award', colorBg: '#CFFAFE', colorText: '#0369A1' },
  { id: 3, name: 'Junior First Officer', threshold: 18, icon: 'award', colorBg: '#DBEAFE', colorText: '#1D4ED8' },
  { id: 4, name: 'First Officer',        threshold: 20, icon: 'star',  colorBg: '#E0E7FF', colorText: '#4338CA' },
  { id: 5, name: 'Captain',              threshold: 22, icon: 'award', colorBg: '#F3E8FF', colorText: '#7E22CE' },
  { id: 6, name: 'Flight Captain',       threshold: 24, icon: 'crown', colorBg: '#FEF3C7', colorText: '#B45309' },
  { id: 7, name: 'Senior Flight Captain',threshold: 26, icon: 'crown', colorBg: '#FFEDD5', colorText: '#C2410C' },
  { id: 8, name: 'Commercial Captain',   threshold: 30, icon: 'crown', colorBg: '#FEE2E2', colorText: '#B91C1C' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROFILE SCREEN
// ═══════════════════════════════════════════════════════════════════════════
// Format PostgreSQL date (ISO string or YYYY-MM-DD) → DD/MM/YYYY for display
function formatDob(raw: string): string {
  if (!raw) return '';
  try {
    // Handle both '1995-08-15' and '1995-08-15T00:00:00.000Z'
    const dateOnly = raw.split('T')[0]; // → '1995-08-15'
    const [year, month, day] = dateOnly.split('-');
    if (!year || !month || !day) return raw;
    return `${day}/${month}/${year}`; // → '15/08/1995'
  } catch {
    return raw;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [activeModal, setActiveModal]   = useState<string | null>(null);
  const [docViewerModal, setDocViewerModal] = useState<{
    visible: boolean;
    documentKey: string | null;
  }>({ visible: false, documentKey: null });
  const [isVoiceOn, setIsVoiceOn]       = useState(true);
  const [perfPeriod, setPerfPeriod]     = useState('daily');
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    newOrders: true, earnings: true, promotions: true, updates: true
  });
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [signingOut, setSigningOut]     = useState(false);

  // ── Real data state ─────────────────────────────────────────────────
  const [dbData, setDbData] = useState<any>({
    fullName: 'Partner', driverId: '—', avatarUrl: null, referralCode: '—',
    totalTrips: 0, totalEarnings: 0, todayEarnings: 0, weeklyOrders: 0, walletBalance: 0,
    outstandingDues: 0,
    vehicleType: '—', vehicleNumber: '—', weightLimit: '—', modelName: '—',
    bankAccount: '—', ifscCode: '—',
    // Updated document structure with front/back support
    documents: {
      aadhar: { front: null, back: null, status: 'pending', rejection_reason: null },
      pan: { front: null, back: null, status: 'pending', rejection_reason: null },
      license: { front: null, back: null, status: 'pending', rejection_reason: null },
      rc: { front: null, back: null, status: 'pending', rejection_reason: null }
    },
    rating: 5.0,
  });
  // ── Edit & save state ──────────────────────────────────────────────────
  const [editData, setEditData]   = useState<Record<string, any>>({});
  const [saving, setSaving]       = useState(false);
  const [isEditing, setIsEditing]  = useState(false);
  const updateEdit = (field: string, value: string) =>
    setEditData(prev => ({ ...prev, [field]: value }));

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<Record<string, {label: string; value: number}[]>>({
    daily: [], monthly: [], yearly: []
  });

  useEffect(() => { loadProfileData(); }, []);
  // Reset edit mode every time a different modal is opened
  useEffect(() => { setIsEditing(false); }, [activeModal]);


  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Profile + leaderboard in parallel
      const [profileRes, leaderRes] = await Promise.allSettled([
        DriverAPI.getProfile(),
        MiscAPI.getLeaderboard(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        const d = profileRes.value.data;
        const p = d.profile   || {};
        const s = d.stats     || {};
        const v = d.vehicle   || {};
        const b = d.bank      || {};
        const docs = d.documents || {};
        const w = d.wallet    || {};

        setDbData({
          fullName:         p.full_name             || 'Partner',
          driverId:         p.driver_id             || p.id || '—',
          mobileNumber:     p.mobile_number         || '—',
          avatarUrl:        p.avatar_url            || null,
          referralCode:     p.referral_code         || '—',
          // Personal details — these are shown & edited in the personal modal
          dob:              p.dob ? formatDob(p.dob) : '',
          bloodGroup:       p.blood_group           || '',
          emergencyContact: p.emergency_contact     || '',
          preferredZone:    p.preferred_zone        || '',
          totalTrips:       s.total_orders_completed || 0,
          totalEarnings:    parseFloat(s.total_earnings || 0),
          todayEarnings:    parseFloat(w.today_earnings || w.todayEarnings || w.today_earnings || 0),
          weeklyOrders:     s.weekly_orders_completed || 0,
          walletBalance:    parseFloat(w.balance || w.wallet_balance || 0),
          outstandingDues:  parseFloat(w.outstanding_dues || w.outstandingDues || 0),
          vehicleType:     v.vehicle_type          || '—',
          vehicleNumber:   v.registration_number   || '—',
          weightLimit:     v.weight_capacity  ? `${v.weight_capacity} kg` : '—',
          modelName:       v.model_name       || v.vehicle_type || '—',
          vehicleBodyType: v.body_type             || '—',
          accountHolder:   b.account_holder_name   || '—',
          bankAccount:     b.account_number        || '—',
          ifscCode:        b.ifsc_code             || '—',
          bankBranch:      b.bank_branch           || '—',
          upiId:           b.upi_id                || '—',
          // Map documents with front/back structure — resolve paths to full backend URLs
          documents: {
            aadhar: { 
              front: resolveDocUrl(docs.aadhar_front_url) || null, 
              back: resolveDocUrl(docs.aadhar_back_url) || null,
              status: docs.aadhar_status || 'pending',
              rejection_reason: docs.verification_rejection_reason || null
            },
            pan: { 
              front: resolveDocUrl(docs.pan_front_url) || null, 
              back: resolveDocUrl(docs.pan_back_url) || null,
              status: docs.pan_status || 'pending',
              rejection_reason: docs.verification_rejection_reason || null
            },
            license: { 
              front: resolveDocUrl(docs.license_front_url) || null, 
              back: resolveDocUrl(docs.license_back_url) || null,
              status: docs.license_status || 'pending',
              rejection_reason: docs.verification_rejection_reason || null
            },
            rc: { 
              front: resolveDocUrl(docs.rc_front_url) || null, 
              back: resolveDocUrl(docs.rc_back_url) || null,
              status: docs.rc_status || 'pending',
              rejection_reason: docs.verification_rejection_reason || null
            }
          },
          rating:        parseFloat(s.rating || '5.0'),
        });
      }

      if (leaderRes.status === 'fulfilled' && leaderRes.value.success) {
        const raw = leaderRes.value.data || [];
        setLeaderboard(raw.slice(0, 5).map((r: any) => ({
          name:     r.isMe ? 'You' : (r.fullName || 'Driver'),
          earnings: r.weeklyEarnings || 0,
          trips:    r.weeklyTrips    || 0,
          rank:     r.rank,
          isMe:     r.isMe,
        })));
      }

      // Fetch graph data for all periods in parallel (non-blocking)
      try {
        const today = new Date();
        const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const [dailyRes, monthlyRes, yearlyRes] = await Promise.allSettled([
          EarningsAPI.get('daily', dateKey as any),
          EarningsAPI.get('monthly', dateKey as any),
          EarningsAPI.get('yearly', dateKey as any),
        ]);

        const toGraph = (res: any, labelFn: (t: any) => string): {label: string; value: number}[] => {
          if (res.status !== 'fulfilled' || !res.value.success) return [];
          return (res.value.data?.trips || []).slice(0, 7).map((t: any) => ({
            label: labelFn(t),
            value: t.amount || 0,
          }));
        };

        setGraphData({
          daily:   toGraph(dailyRes,   (t) => t.date ? new Date(t.date).toLocaleDateString('en-IN', {weekday:'short'}) : ''),
          monthly: toGraph(monthlyRes, (t) => t.date ? new Date(t.date).toLocaleDateString('en-IN', {month:'short'}) : ''),
          yearly:  toGraph(yearlyRes,  (t) => t.date ? new Date(t.date).toLocaleDateString('en-IN', {month:'short'}) : ''),
        });
      } catch {}

    } catch (e) {
      console.log('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) return; // Prevent double-tap
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        performLogout();
      }
    } else {
      Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: performLogout },
      ],
      { cancelable: true }
    );
    }
  };

  const performLogout = async () => {
    setSigningOut(true);
    try {
      // Best-effort: go offline before clearing token
      try {
        await DriverAPI.setOnlineStatus(false);
      } catch {
        // Don't block logout if this fails (e.g. no network)
      }

      // Clear all auth data from storage
      await AuthAPI.logout();

      // Navigate to login — replace so back button cannot return to tabs
      router.replace('/login');
    } catch (error) {
      console.error('[ProfileScreen] Logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('Could not sign out. Please try again.');
      } else {
        Alert.alert('Sign Out Failed', 'Could not sign out. Please try again.');
      }
      setSigningOut(false); // Re-enable button only on failure
    }
  };

  // ── Avatar upload + save helper ────────────────────────────────────────
  const handleAvatarUpload = async () => {
    const pick = async (fn: () => Promise<any>) => {
      const result = await fn();
      if (!result) return;
      try {
        await DriverAPI.uploadAvatar(result.uri);
        setDbData((prev: any) => ({ ...prev, avatarUrl: result.uri }));
        Alert.alert('Photo Updated', 'Profile photo updated.');
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message || 'Could not upload photo.');
      }
    };
    if (isWeb) { pick(openGallery); return; }
    Alert.alert('Update Photo', 'Choose source', [
      { text: 'Camera',  onPress: () => pick(openCamera)  },
      { text: 'Gallery', onPress: () => pick(openGallery) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Route save to the correct API endpoint based on payload keys
  const isBankPayload  = (p: any) =>
    Object.keys(p).some(k => ['accountHolder','accountNumber','ifscCode','bankBranch','upiId'].includes(k));
  const isVehiclePayload = (p: any) => 'vehicleNumber' in p || 'registration_number' in p;

  const saveProfile = async (payload: Record<string, any>, successMsg = 'Saved!') => {
    setSaving(true);
    try {
      let result;
      if (isBankPayload(payload)) {
        result = await DriverAPI.updateBankAccount(payload);
      } else if (isVehiclePayload(payload)) {
        result = await DriverAPI.updateVehicle({ vehicleNumber: payload.vehicleNumber || payload.registration_number });
      } else {
        result = await DriverAPI.updateProfile(payload);
      }
      if (result && result.success) {
        // Merge friendly display keys back so UI updates immediately
        const displayUpdate: Record<string,any> = {};
        if (payload.accountHolder)  displayUpdate.accountHolder  = payload.accountHolder;
        if (payload.accountNumber)  displayUpdate.bankAccount    = payload.accountNumber;
        if (payload.ifscCode)       displayUpdate.ifscCode       = payload.ifscCode;
        if (payload.bankBranch)     displayUpdate.bankBranch     = payload.bankBranch;
        if (payload.upiId !== undefined) displayUpdate.upiId    = payload.upiId;
        if (payload.vehicleNumber)  displayUpdate.vehicleNumber  = payload.vehicleNumber;
        if (payload.full_name || payload.fullName)     displayUpdate.fullName        = payload.full_name || payload.fullName;
        if (payload.date_of_birth || payload.dob)      displayUpdate.dob             = payload.date_of_birth || payload.dob;
        if (payload.blood_group || payload.bloodGroup) displayUpdate.bloodGroup      = payload.blood_group || payload.bloodGroup;
        if (payload.emergency_contact || payload.emergencyContact) displayUpdate.emergencyContact = payload.emergency_contact || payload.emergencyContact;
        if (payload.preferred_zone || payload.preferredZone) displayUpdate.preferredZone = payload.preferred_zone || payload.preferredZone;
        setDbData((prev: any) => ({ ...prev, ...displayUpdate }));
        if (Platform.OS === 'web') { window.alert(successMsg); }
        else { Alert.alert(successMsg, ''); }
        setIsEditing(false);
        setEditData({});
      } else {
        const msg = (result && result.message) || 'Failed to save.';
        if (Platform.OS === 'web') { window.alert('Error: ' + msg); }
        else { Alert.alert('Error', msg); }
      }
    } catch (err: any) {
      const msg = err.message || 'Network error.';
      if (Platform.OS === 'web') { window.alert('Error: ' + msg); }
      else { Alert.alert('Error', msg); }
    } finally {
      setSaving(false);
    }
  };

  // ── Derived rank data ─────────────────────────────────────────────────
  const currentWeeklyOrders = dbData.weeklyOrders;
  let currentRankIndex = ranks.findIndex(r => currentWeeklyOrders < r.threshold) - 1;
  if (currentRankIndex < 0) currentRankIndex = ranks.length - 1;
  const currentRank = ranks[currentRankIndex];
  const isPilot = currentWeeklyOrders >= 50;
  const progressPercent = Math.min(100, (currentWeeklyOrders / 50) * 100);
  const ordersNeededForPilot = Math.max(0, 50 - currentWeeklyOrders);

  const toggleNotif = (key: string) => setNotifSettings(prev => ({...prev, [key]: !prev[key]}));

  const renderModal = () => {
    if (!activeModal) return null;
    let content = null;

    // ── PERSONAL DETAILS — view → pencil → edit ──────────────────────
    if (activeModal === 'personal') {
      const BLOOD = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
      const ZONES = ['North Chennai','South Chennai','Central Chennai','OMR & ECR'];

      if (!isEditing) {
        // ── READ-ONLY VIEW ────────────────────────────────────────────
        content = (
          <View>
            {/* Header with pencil */}
            <View style={styles.modalHeader}>
              <Feather name="user" size={22} color="#0284C7" />
              <Text style={[styles.modalTitle, {flex:1}]}>Personal Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditData({
                    fullName: dbData.fullName, dob: dbData.dob,
                    bloodGroup: dbData.bloodGroup, emergencyContact: dbData.emergencyContact,
                    preferredZone: dbData.preferredZone,
                  });
                  setIsEditing(true);
                }}
                style={styles.pencilBtn}
              >
                <Feather name="edit-2" size={16} color="#0284C7" />
                <Text style={styles.pencilBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Display rows */}
            {[
              { icon: 'user',      label: 'Full Name',         value: dbData.fullName },
              { icon: 'calendar',  label: 'Date of Birth',     value: dbData.dob },
              { icon: 'phone',     label: 'Emergency Contact', value: dbData.emergencyContact ? `+91 ${dbData.emergencyContact}` : '—' },
              { icon: 'heart',     label: 'Blood Group',       value: dbData.bloodGroup },
              { icon: 'map-pin',   label: 'Preferred Zone',    value: dbData.preferredZone },
            ].map(row => (
              <View key={row.label} style={styles.viewRow}>
                <View style={styles.viewRowIcon}>
                  <Feather name={row.icon as any} size={16} color="#0284C7" />
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.viewRowLabel}>{row.label}</Text>
                  <Text style={styles.viewRowValue}>{row.value || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      } else {
        // ── EDIT FORM ─────────────────────────────────────────────────
        content = (
          <View>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backIconBtn}>
                <Feather name="arrow-left" size={18} color="#475569" />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, {flex:1}]}>Edit Personal Details</Text>
            </View>

            <Text style={styles.editFieldLabel}>Full Name *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.fullName ?? ''}
              onChangeText={v => updateEdit('fullName', v)}
              placeholder="Full name as per Aadhaar" />

            <Text style={styles.editFieldLabel}>Date of Birth</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.dob ?? ''}
              onChangeText={v => updateEdit('dob', v)}
              placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} />

            <Text style={styles.editFieldLabel}>Emergency Contact</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.emergencyContact ?? ''}
              onChangeText={v => updateEdit('emergencyContact', v.replace(/[^0-9]/g,'').slice(0,10))}
              placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} />

            <Text style={styles.editFieldLabel}>Blood Group</Text>
            <View style={styles.editChipRow}>
              {BLOOD.map(g => (
                <TouchableOpacity key={g} onPress={() => updateEdit('bloodGroup', g)}
                  style={[styles.editChip, editData.bloodGroup === g && styles.editChipActive]}>
                  <Text style={[styles.editChipText, editData.bloodGroup === g && {color:'#0284C7', fontWeight:'900'}]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editFieldLabel}>Preferred Zone</Text>
            <View style={styles.editChipRow}>
              {ZONES.map(z => (
                <TouchableOpacity key={z} onPress={() => updateEdit('preferredZone', z)}
                  style={[styles.editChip, editData.preferredZone === z && styles.editChipActive]}>
                  <Text style={[styles.editChipText, editData.preferredZone === z && {color:'#0284C7', fontWeight:'900'}]}>{z}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                // Convert DD/MM/YYYY → YYYY-MM-DD for PostgreSQL date column
                const dobForDb = editData.dob
                  ? editData.dob.split('/').reverse().join('-')
                  : undefined;
                saveProfile({
                  fullName:         editData.fullName,
                  dob:              dobForDb,
                  emergencyContact: editData.emergencyContact,
                  bloodGroup:       editData.bloodGroup,
                  preferredZone:    editData.preferredZone,
                }, 'Personal details saved');
              }}
              disabled={saving}
              style={[styles.saveBtn, saving && {opacity:0.6}]}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        );
      }
    }

    // ── ACHIEVEMENTS ─────────────────────────────────────────────────
    if (activeModal === 'achievements') {
      const nextRank = ranks[currentRankIndex + 1];
      let rankProgress = 100;
      let ordersNeeded = 0;
      if (nextRank) {
        const range = nextRank.threshold - currentRank.threshold;
        const progress = currentWeeklyOrders - currentRank.threshold;
        rankProgress = Math.min(100, Math.max(0, (progress / range) * 100));
        ordersNeeded = nextRank.threshold - currentWeeklyOrders;
      }
      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="award" size={24} color="#0284C7" />
            <Text style={styles.modalTitle}>Weekly Aviation Ranks</Text>
          </View>
          <View style={[styles.rankHeroCard, {backgroundColor: currentRank.colorBg}]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.rankSubText, {color: currentRank.colorText}]}>CURRENT RANK</Text>
                <Text style={[styles.rankHeroText, {color: currentRank.colorText}]}>{currentRank.name}</Text>
              </View>
              <View style={styles.rankHeroIconBox}>
                <NativeIcon name={currentRank.icon} size={32} color={currentRank.colorText} />
              </View>
            </View>
            {nextRank ? (
              <View style={{marginTop: 16}}>
                <View style={styles.rowBetween}>
                  <Text style={[{fontSize: 12, fontWeight: 'bold'}, {color: currentRank.colorText}]}>{currentWeeklyOrders} Orders</Text>
                  <Text style={{fontSize: 12, fontWeight: 'bold', color: 'rgba(0,0,0,0.5)'}}>{nextRank.threshold} Goal</Text>
                </View>
                <View style={styles.progressBarBgLight}>
                  <View style={[styles.progressBarFillLight, { width: `${rankProgress}%`, backgroundColor: currentRank.colorText }]} />
                </View>
                <Text style={[{fontSize: 12, marginTop: 8, fontWeight: '600'}, {color: currentRank.colorText}]}>
                  {ordersNeeded} more orders to reach {nextRank.name}
                </Text>
              </View>
            ) : (
              <Text style={[{fontSize: 14, fontWeight: 'bold', marginTop: 16}, {color: currentRank.colorText}]}>You are at the top rank! Incredible work!</Text>
            )}
          </View>
          <Text style={styles.sectionTitle}>Progression Path</Text>
          <View style={styles.pathContainer}>
            {ranks.map((rank, index) => {
              const isCompleted = currentWeeklyOrders >= rank.threshold;
              const isCurrent = index === currentRankIndex;
              return (
                <View key={rank.id} style={styles.pathRow}>
                  <View style={[styles.pathLine, index === ranks.length - 1 && {display: 'none'}]} />
                  <View style={[styles.pathDot, (isCompleted || isCurrent) ? {backgroundColor: rank.colorBg} : {backgroundColor: '#F1F5F9'}]}>
                    <NativeIcon name={rank.icon} size={16} color={(isCompleted || isCurrent) ? rank.colorText : '#94A3B8'} />
                  </View>
                  <View style={[styles.pathCard, isCurrent ? {backgroundColor: rank.colorBg, borderColor: rank.colorBg} : isCompleted ? {backgroundColor: '#F8FAFC'} : {backgroundColor: '#FFF', opacity: 0.5}]}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.pathCardTitle, isCurrent ? {color: rank.colorText} : {color: '#0F172A'}]}>{rank.name}</Text>
                      {isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>CURRENT</Text></View>}
                    </View>
                    <Text style={[styles.pathCardSub, isCurrent ? {color: rank.colorText} : {color: '#64748B'}]}>
                      {rank.threshold === 0 ? 'Starting Rank' : `${rank.threshold}+ Orders / Week`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    // ── PERFORMANCE ───────────────────────────────────────────────────
    else if (activeModal === 'performance') {
      const currentGraph = graphData[perfPeriod] || [];
      const maxVal = currentGraph.length > 0 ? Math.max(...currentGraph.map(d => d.value), 1) : 1;
      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="trending-up" size={24} color="#0284C7" />
            <Text style={styles.modalTitle}>Performance</Text>
          </View>
          <View style={styles.tabsRow}>
            {['daily', 'monthly', 'yearly'].map(p => (
              <TouchableOpacity key={p} onPress={() => setPerfPeriod(p)} style={[styles.tabBtn, perfPeriod === p ? styles.tabActive : styles.tabInactive]}>
                <Text style={[styles.tabText, perfPeriod === p ? {color: '#FFF'} : {color: '#64748B'}]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, {borderColor: '#BFDBFE', backgroundColor: '#EFF6FF'}]}>
              <Text style={[styles.statLabel, {color: '#1D4ED8'}]}>Rating</Text>
              <Text style={[styles.statValue, {color: '#1E3A8A'}]}>{dbData.rating.toFixed(1)}⭐</Text>
            </View>
            <View style={[styles.statBox, {borderColor: '#BBF7D0', backgroundColor: '#F0FDF4'}]}>
              <Text style={[styles.statLabel, {color: '#15803D'}]}>Earnings</Text>
              <Text style={[styles.statValue, {color: '#14532D'}]}>₹{dbData.totalEarnings}</Text>
            </View>
            <View style={[styles.statBox, {borderColor: '#E9D5FF', backgroundColor: '#FAF5FF'}]}>
              <Text style={[styles.statLabel, {color: '#7E22CE'}]}>Trips</Text>
              <Text style={[styles.statValue, {color: '#581C87'}]}>{dbData.totalTrips}</Text>
            </View>
          </View>
          <View style={styles.graphCard}>
            {currentGraph.length > 0 ? (
              <View style={styles.graphContainer}>
                {currentGraph.map((item, i) => (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barWrap}>
                      <View style={[styles.barFill, { height: `${(item.value / maxVal) * 100}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                <Text style={{color:'#94A3B8',fontSize:13}}>No data for this period</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    // ── LEADERBOARD ───────────────────────────────────────────────────
    else if (activeModal === 'leaderboard') {
      content = (
        <View>
          <View style={styles.modalHeader}>
            <NativeIcon name="award" size={24} color="#D97706" />
            <Text style={styles.modalTitle}>Weekly Leaderboard</Text>
          </View>
          <View style={styles.leaderboardList}>
            {leaderboard.length === 0 ? (
              <Text style={{color:'#94A3B8',textAlign:'center',marginTop:20}}>No leaderboard data yet</Text>
            ) : leaderboard.map(driver => (
              <View key={driver.rank} style={[styles.leaderCard, driver.isMe ? styles.leaderCardMe : styles.leaderCardNormal]}>
                <View style={[styles.rankBadge, driver.rank <= 3 ? styles.rankTop : styles.rankNormal]}>
                  {driver.rank <= 3 ? <Feather name="award" size={20} color="#FFF" /> : <Text style={styles.rankNum}>{driver.rank}</Text>}
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.leaderName}>{driver.name}</Text>
                  <Text style={styles.leaderStats}>{driver.trips} trips • ₹{driver.earnings}</Text>
                </View>
                <Text style={styles.rankDisplay}>#{driver.rank}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // ── DOCUMENTS ─────────────────────────────────────────────────────
    else if (activeModal === 'docs') {
      const renderDocCard = (
        name: string,
        docKey: string,
        icon: string,
        docData: { front: string | null; back: string | null; status: string; rejection_reason: string | null }
      ) => {
        const isBothUploaded = docData.front && docData.back;
        const statusColors = {
          pending: { bg: '#fef3c7', text: '#d97706', icon: 'clock' },
          verified: { bg: '#d1fae5', text: '#059669', icon: 'check-circle' },
          rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'alert-circle' },
          incomplete: { bg: '#fed7aa', text: '#ea580c', icon: 'alert-triangle' },
        };
        const statusInfo = (statusColors as any)[docData.status] || statusColors.pending;

        return (
          <TouchableOpacity
            key={docKey}
            onPress={() => setDocViewerModal({ visible: true, documentKey: docKey })}
            style={[
              styles.docCardContainer,
              {borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 16, marginBottom: 16}
            ]}
          >
            <View style={styles.rowBetween}>
              <View style={styles.rowCenter}>
                <View style={[{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, { backgroundColor: statusInfo.bg }]}>
                  <Feather name={icon as any} size={20} color={statusInfo.text} />
                </View>
                <View>
                  <Text style={[styles.docName, {fontSize: 15, fontWeight: '600'}]}>{name}</Text>
                  <Text style={[styles.docSub, {fontSize: 12, marginTop: 2}]}>
                    {isBothUploaded ? '✓ Both sides uploaded' : docData.front || docData.back ? 'Only one side' : 'Not uploaded'}
                  </Text>
                </View>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <View style={[{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }, { backgroundColor: statusInfo.bg }]}>
                  <Text style={{fontSize: 11, fontWeight: '600', color: statusInfo.text, textTransform: 'capitalize'}}>
                    {docData.status === 'pending' ? 'pending' : docData.status}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9ca3af" style={{marginTop: 4}} />
              </View>
            </View>
          </TouchableOpacity>
        );
      };

      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="file-text" size={24} color="#0284C7" />
            <Text style={styles.modalTitle}>KYC Documents</Text>
          </View>
          <Text style={[styles.docIntroMsg, {marginBottom: 20}]}>Tap any document to view, edit, or re-upload</Text>
          <View style={styles.docList}>
            {renderDocCard('Driving License', 'license', 'smartphone', dbData.documents.license)}
            {renderDocCard('RC Book', 'rc', 'file-text', dbData.documents.rc)}
            {renderDocCard('PAN Card', 'pan', 'credit-card', dbData.documents.pan)}
            {renderDocCard('Aadhaar Card', 'aadhar', 'credit-card', dbData.documents.aadhar)}
          </View>
        </View>
      );
    }

    // ── BANK — view → pencil → edit ──────────────────────────────────
    else if (activeModal === 'bank') {
      // mask account number for display: show last 4 digits only
      const maskedAcc = dbData.bankAccount && dbData.bankAccount !== '—'
        ? '•••• ' + dbData.bankAccount.slice(-4)
        : '—';

      if (!isEditing) {
        // ── READ-ONLY VIEW ────────────────────────────────────────────
        content = (
          <View>
            <View style={styles.modalHeader}>
              <NativeIcon name="credit-card" size={22} color="#0284C7" />
              <Text style={[styles.modalTitle, {flex:1}]}>Bank Account</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditData({
                    accountHolder: dbData.accountHolder,
                    bankAccount:   dbData.bankAccount,
                    ifscCode:      dbData.ifscCode,
                    bankBranch:    dbData.bankBranch,
                    upiId:         dbData.upiId,
                  });
                  setIsEditing(true);
                }}
                style={styles.pencilBtn}
              >
                <Feather name="edit-2" size={16} color="#0284C7" />
                <Text style={styles.pencilBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Visual bank card */}
            <View style={styles.bankCardBg}>
              <View style={styles.rowBetween}>
                <Text style={styles.bankLabel}>BANK ACCOUNT</Text>
                <NativeIcon name="credit-card" size={24} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.bankAccNum}>{maskedAcc}</Text>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.bankSubLabel}>ACCOUNT HOLDER</Text>
                  <Text style={styles.bankSubValue}>{(dbData.accountHolder || dbData.fullName).toUpperCase()}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={styles.bankSubLabel}>IFSC</Text>
                  <Text style={styles.bankSubValue}>{(dbData.ifscCode || '—').toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* Detail rows */}
            {[
              { icon: 'hash',       label: 'Account Number', value: maskedAcc },
              { icon: 'code',       label: 'IFSC Code',      value: dbData.ifscCode },
              { icon: 'map-pin',    label: 'Branch',         value: dbData.bankBranch },
              { icon: 'credit-card',label: 'UPI ID',         value: dbData.upiId },
            ].map(row => (
              <View key={row.label} style={styles.viewRow}>
                <View style={styles.viewRowIcon}>
                  <Feather name={row.icon as any} size={16} color="#0284C7" />
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.viewRowLabel}>{row.label}</Text>
                  <Text style={styles.viewRowValue}>{row.value || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      } else {
        // ── EDIT FORM ─────────────────────────────────────────────────
        content = (
          <View>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backIconBtn}>
                <Feather name="arrow-left" size={18} color="#475569" />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, {flex:1}]}>Edit Bank Details</Text>
            </View>

            <Text style={styles.editFieldLabel}>Account Holder Name *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.accountHolder ?? ''}
              onChangeText={v => updateEdit('accountHolder', v)}
              placeholder="As per bank records" />

            <Text style={styles.editFieldLabel}>Account Number *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.bankAccount ?? ''}
              onChangeText={v => updateEdit('bankAccount', v.replace(/[^0-9]/g,''))}
              placeholder="e.g. 1234567890123" keyboardType="number-pad" />

            <Text style={styles.editFieldLabel}>IFSC Code *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.ifscCode ?? ''}
              onChangeText={v => updateEdit('ifscCode', v.toUpperCase())}
              placeholder="e.g. SBIN0001234" autoCapitalize="characters" />

            <Text style={styles.editFieldLabel}>Bank Branch Name *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.bankBranch ?? ''}
              onChangeText={v => updateEdit('bankBranch', v)}
              placeholder="e.g. Anna Nagar, Chennai" />

            <Text style={styles.editFieldLabel}>UPI ID (optional)</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.upiId ?? ''}
              onChangeText={v => updateEdit('upiId', v)}
              placeholder="e.g. yourname@upi" keyboardType="email-address" autoCapitalize="none" />

            <TouchableOpacity
              onPress={() => saveProfile({
                accountHolder: editData.accountHolder,
                accountNumber: editData.bankAccount,
                ifscCode:      editData.ifscCode,
                bankBranch:    editData.bankBranch,
                upiId:         editData.upiId ?? '',
              }, 'Bank details saved')}
              disabled={saving}
              style={[styles.saveBtn, saving && {opacity:0.6}]}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Bank Details</Text>}
            </TouchableOpacity>
          </View>
        );
      }
    }

    // ── VEHICLE — view → pencil → edit ───────────────────────────────
    else if (activeModal === 'vehicle') {
      if (!isEditing) {
        // ── READ-ONLY VIEW ────────────────────────────────────────────
        content = (
          <View>
            <View style={styles.modalHeader}>
              <NativeIcon name="truck" size={22} color="#0284C7" />
              <Text style={[styles.modalTitle, {flex:1}]}>Vehicle Info</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditData({ vehicleNumber: dbData.vehicleNumber });
                  setIsEditing(true);
                }}
                style={styles.pencilBtn}
              >
                <Feather name="edit-2" size={16} color="#0284C7" />
                <Text style={styles.pencilBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Hero card */}
            <View style={styles.vehCardHero}>
              <View style={styles.rowCenter}>
                <View style={styles.vehHeroIcon}>
                  <NativeIcon name="truck" size={24} color="#FFF" />
                </View>
                <View style={{marginLeft:12}}>
                  <Text style={styles.vehHeroLabel}>Vehicle Type</Text>
                  <Text style={styles.vehHeroValue}>{dbData.modelName || dbData.vehicleType}</Text>
                </View>
              </View>
            </View>

            {/* Detail rows */}
            {[
              { icon: 'hash',      label: 'Registration Number', value: dbData.vehicleNumber },
              { icon: 'package',   label: 'Weight Capacity',     value: dbData.weightLimit },
              { icon: 'box',       label: 'Body Type',           value: dbData.vehicleBodyType },
              { icon: 'truck',     label: 'Vehicle Category',    value: dbData.vehicleType },
            ].map(row => (
              <View key={row.label} style={styles.viewRow}>
                <View style={styles.viewRowIcon}>
                  <Feather name={row.icon as any} size={16} color="#0284C7" />
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.viewRowLabel}>{row.label}</Text>
                  <Text style={styles.viewRowValue}>{row.value || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      } else {
        // ── EDIT FORM ─────────────────────────────────────────────────
        content = (
          <View>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backIconBtn}>
                <Feather name="arrow-left" size={18} color="#475569" />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, {flex:1}]}>Edit Vehicle Info</Text>
            </View>

            {/* Read-only fields shown for reference */}
            <View style={[styles.viewRow, {backgroundColor:'#F8FAFC',borderRadius:12,marginBottom:4}]}>
              <View style={styles.viewRowIcon}><NativeIcon name="truck" size={16} color="#94A3B8" /></View>
              <View style={{flex:1}}>
                <Text style={styles.viewRowLabel}>Vehicle Type (read-only)</Text>
                <Text style={[styles.viewRowValue, {color:'#94A3B8'}]}>{dbData.modelName || dbData.vehicleType}</Text>
              </View>
            </View>
            <View style={[styles.viewRow, {backgroundColor:'#F8FAFC',borderRadius:12,marginBottom:16}]}>
              <View style={styles.viewRowIcon}><Feather name="package" size={16} color="#94A3B8" /></View>
              <View style={{flex:1}}>
                <Text style={styles.viewRowLabel}>Capacity (read-only)</Text>
                <Text style={[styles.viewRowValue, {color:'#94A3B8'}]}>{dbData.weightLimit}</Text>
              </View>
            </View>

            <Text style={styles.editFieldLabel}>Registration Number *</Text>
            <TextInput style={styles.editFieldInput}
              value={editData.vehicleNumber ?? ''}
              onChangeText={v => updateEdit('vehicleNumber', v.toUpperCase())}
              placeholder="e.g. TN01AB1234" autoCapitalize="characters" />

            <View style={{flexDirection:'row',backgroundColor:'#FEF9C3',padding:12,borderRadius:12,marginBottom:16,gap:8}}>
              <Feather name="info" size={14} color="#D97706" />
              <Text style={{fontSize:12,color:'#92400E',flex:1,fontWeight:'600'}}>
                Vehicle type and capacity can only be changed by contacting support.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => saveProfile({ vehicleNumber: editData.vehicleNumber }, 'Vehicle updated')}
              disabled={saving}
              style={[styles.saveBtn, saving && {opacity:0.6}]}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Vehicle Details</Text>}
            </TouchableOpacity>
          </View>
        );
      }
    }

    // ── REFERRAL ──────────────────────────────────────────────────────
    else if (activeModal === 'referral') {
      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="gift" size={24} color="#D97706" />
            <Text style={styles.modalTitle}>Refer & Earn</Text>
          </View>
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Your Code</Text>
            <View style={styles.refRow}>
              <View style={styles.refCodeBox}><Text style={styles.refCodeText}>{dbData.referralCode}</Text></View>
              <TouchableOpacity onPress={() => { Clipboard.setString(dbData.referralCode); Alert.alert('Copied!', 'Referral code copied to clipboard.'); }} style={styles.refCopyBtn}>
                <Feather name="copy" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.refSub}>Share with your friends to earn!</Text>
          </View>
        </View>
      );
    }

    // ── NOTIFICATIONS ─────────────────────────────────────────────────
    else if (activeModal === 'notifications') {
      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="bell" size={24} color="#0284C7" />
            <Text style={styles.modalTitle}>Notifications</Text>
          </View>
          <View style={styles.notifList}>
            {Object.keys(notifSettings).map(key => (
              <View key={key} style={styles.notifRow}>
                <Text style={styles.notifLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                <TouchableOpacity onPress={() => toggleNotif(key)} style={[styles.switchBtn, notifSettings[key] ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchKnob, notifSettings[key] ? styles.knobOn : styles.knobOff]} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // ── SUPPORT ───────────────────────────────────────────────────────
    else if (activeModal === 'support') {
      content = (
        <View>
          <View style={styles.modalHeader}>
            <Feather name="help-circle" size={24} color="#16A34A" />
            <Text style={styles.modalTitle}>Support</Text>
          </View>
          <View style={styles.suppList}>
            <TouchableOpacity style={styles.suppBtn}>
              <Text style={styles.suppBtnText}>FAQs</Text>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.suppBtn}>
              <Text style={styles.suppBtnText}>Contact Support</Text>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
            <View style={styles.suppCallBox}>
              <Text style={styles.suppCallLabel}>24/7 Support Available</Text>
              <TouchableOpacity onPress={() => Linking.openURL('tel:+911800123456')}>
                <Text style={styles.suppCallNum}>1800-123-456</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // ── EMERGENCY ─────────────────────────────────────────────────────
    else if (activeModal === 'emergency') {
      content = (
        <View style={{alignItems: 'center'}}>
          <View style={[styles.modalHeader, {justifyContent: 'center'}]}>
            <Feather name="alert-circle" size={24} color="#DC2626" />
            <Text style={[styles.modalTitle, {color: '#DC2626', marginLeft: 8}]}>Emergency SOS</Text>
          </View>
          <View style={styles.sosCard}>
            <Text style={styles.sosSub}>Pressing this will alert your emergency contacts instantly.</Text>
            <TouchableOpacity onPress={() => { Alert.alert('SOS Triggered!', 'Alerting emergency contacts.'); setActiveModal(null); }} style={styles.sosBtn}>
              <Feather name="phone" size={24} color="#FFF" />
              <Text style={styles.sosBtnText}>TRIGGER SOS</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sosLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('tel:112')} style={styles.sosLinkBtn}><Text style={styles.sosLinkText}>📞 Police (112)</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:102')} style={styles.sosLinkBtn}><Text style={styles.sosLinkText}>🚑 Ambulance (102)</Text></TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <Modal transparent visible animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setActiveModal(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              {content}
            </ScrollView>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtnPrimary}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={{color:'#64748B', marginTop:12, fontWeight:'600'}}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>

        {/* Header Profile Info */}
        <View style={styles.profileHeader}>
          {/* Tappable avatar with camera badge */}
          <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarWrapper}>
            <View style={styles.avatarBox}>
              {dbData.avatarUrl ? (
                <Image source={{uri: dbData.avatarUrl.startsWith('/') ? BASE_URL + dbData.avatarUrl : dbData.avatarUrl}} style={{width:80,height:80,borderRadius:40}} />
              ) : (
                <Feather name="user" size={40} color="#94A3B8" />
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.rowCenter}>
              <Text style={styles.profileName}>{dbData.fullName}</Text>
              {isPilot && <View style={{marginLeft: 8}}><NativeIcon name="crown" size={20} color="#F59E0B" /></View>}
            </View>
            <View style={styles.ratingRow}>
              <Feather name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{dbData.rating.toFixed(1)} Rating</Text>
            </View>
            <Text style={styles.driverIdText}>ID: #{dbData.driverId}</Text>
            <TouchableOpacity
              onPress={() => {
                setEditData({
                fullName: dbData.fullName,
                dob: dbData.dob,
                bloodGroup: dbData.bloodGroup,
                emergencyContact: dbData.emergencyContact,
                preferredZone: dbData.preferredZone,
              });
                setActiveModal('personal');
              }}
              style={styles.editPersonalBtn}
            >
              <Feather name="edit-2" size={11} color="#0284C7" />
              <Text style={styles.editPersonalBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Stats Grid */}
        <View style={styles.topStatsGrid}>
          <View style={[styles.statHero, {backgroundColor: '#EFF6FF', borderColor: '#BFDBFE'}]}>
            <View style={styles.rowCenter}>
              <Feather name="bar-chart-2" size={16} color="#2563EB" />
              <Text style={[styles.statHeroLabel, {color: '#2563EB'}]}>Total Stats</Text>
            </View>
            <Text style={[styles.statHeroValue, {color: '#1D4ED8'}]}>{dbData.totalTrips}</Text>
            <Text style={[styles.statHeroSub, {color: '#2563EB'}]}>Trips</Text>
          </View>
          <View style={[styles.statHero, {backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'}]}>
            <View style={styles.rowCenter}>
              <Feather name="dollar-sign" size={16} color="#16A34A" />
              <Text style={[styles.statHeroLabel, {color: '#16A34A'}]}>Total Earnings</Text>
            </View>
            <Text style={[styles.statHeroValue, {color: '#15803D'}]}>₹{dbData.totalEarnings}</Text>
            <Text style={[styles.statHeroSub, {color: '#16A34A'}]}>Total</Text>
          </View>
        </View>

        {/* PILOT CARD */}
        <LinearGradient
          colors={isPilot ? ['#FEF3C7', '#FDE68A'] : ['#F8FAFC', '#F1F5F9']}
          style={[styles.pilotCard, isPilot ? styles.pilotCardActive : styles.pilotCardNormal]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <View style={[styles.pilotIcon, isPilot ? {backgroundColor: '#F59E0B'} : {backgroundColor: '#E2E8F0'}]}>
                <NativeIcon name="crown" size={24} color={isPilot ? "#FFF" : "#64748B"} />
              </View>
              <View style={{marginLeft: 12}}>
                <Text style={[styles.pilotTitle, isPilot ? {color: '#B45309'} : {color: '#334155'}]}>{isPilot ? 'Pilot Partner' : 'Standard Partner'}</Text>
                <Text style={styles.pilotSub}>{currentWeeklyOrders} orders this week</Text>
              </View>
            </View>
            {isPilot ? (
              <View style={styles.pilotBadge}><Text style={styles.pilotBadgeText}>PILOT</Text></View>
            ) : (
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.pilotProgressLabel}>Progress</Text>
                <Text style={styles.pilotProgressValue}>{Math.round(progressPercent)}%</Text>
              </View>
            )}
          </View>
          <View style={styles.pilotTrack}>
            <View style={[styles.pilotFill, isPilot ? {backgroundColor: '#F59E0B', width: '100%'} : {backgroundColor: '#0284C7', width: `${progressPercent}%`}]} />
          </View>
          {isPilot ? (
            <View style={styles.rowCenter}>
              <Feather name="check-circle" size={16} color="#B45309" />
              <Text style={styles.pilotCongratsText}>Congratulations! You are a Pilot!</Text>
            </View>
          ) : (
            <Text style={styles.pilotNeedText}>{ordersNeededForPilot} more orders to become a Pilot!</Text>
          )}
        </LinearGradient>

        {/* AVIATION RANK */}
        <TouchableOpacity onPress={() => setActiveModal('achievements')} style={styles.rankBtn}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <Feather name="award" size={20} color="#9333EA" />
              <View style={{marginLeft: 12}}>
                <Text style={styles.rankBtnTitle}>Aviation Rank</Text>
                <Text style={styles.rankBtnSub}>{currentRank.name} • View progression</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#9333EA" />
          </View>
        </TouchableOpacity>

        {/* VOICE TOGGLE */}
        <TouchableOpacity onPress={() => setIsVoiceOn(!isVoiceOn)} style={[styles.voiceBtn, isVoiceOn ? styles.voiceBtnOn : styles.voiceBtnOff]}>
          <View style={styles.rowCenter}>
            <Feather name={isVoiceOn ? 'volume-2' : 'volume-x'} size={18} color={isVoiceOn ? '#0284C7' : '#64748B'} />
            <Text style={[styles.voiceBtnText, isVoiceOn ? {color: '#0284C7'} : {color: '#64748B'}]}>Voice Narration</Text>
          </View>
          <View style={[styles.switchBtn, isVoiceOn ? styles.switchOn : styles.switchOff]}>
            <View style={[styles.switchKnob, isVoiceOn ? styles.knobOn : styles.knobOff]} />
          </View>
        </TouchableOpacity>

        {/* WALLET */}
        <TouchableOpacity onPress={() => setIsWalletOpen(true)} style={styles.walletBtn}>
          <View style={styles.rowCenter}>
            <View style={styles.walletIcon}><Feather name="credit-card" size={20} color="#FFF" /></View>
            <View style={{marginLeft: 16}}>
              <Text style={styles.walletLabel}>WALLET BALANCE</Text>
              <Text style={styles.walletValue}>₹{dbData.walletBalance}</Text>
            </View>
          </View>
          <View style={styles.walletViewBtn}><Text style={styles.walletViewText}>View</Text></View>
        </TouchableOpacity>

        {/* LIST ACTIONS */}
        <View style={styles.actionList}>
          <TouchableOpacity
            onPress={() => {
              setEditData({
                fullName: dbData.fullName,
                dob: dbData.dob,
                bloodGroup: dbData.bloodGroup,
                emergencyContact: dbData.emergencyContact,
                preferredZone: dbData.preferredZone,
              });
              setActiveModal('personal');
            }}
            style={[styles.actionItem, {borderColor:'#BFDBFE',backgroundColor:'#EFF6FF'}]}
          >
            <Feather name="edit-2" size={18} color="#0284C7" />
            <Text style={[styles.actionText, {color:'#1D4ED8'}]}>Edit Personal Details</Text>
            <Feather name="chevron-right" size={16} color="#0284C7" style={{marginLeft:'auto'}} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('performance')} style={styles.actionItem}>
            <Feather name="trending-up" size={18} color="#64748B" /><Text style={styles.actionText}>Performance Graph</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('leaderboard')} style={styles.actionItem}>
            <Feather name="award" size={18} color="#64748B" /><Text style={styles.actionText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('notifications')} style={styles.actionItem}>
            <Feather name="bell" size={18} color="#64748B" /><Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditData({ vehicleNumber: dbData.vehicleNumber });
              setActiveModal('vehicle');
            }}
            style={styles.actionItem}
          >
            <NativeIcon name="truck" size={18} color="#64748B" /><Text style={styles.actionText}>Vehicle Info</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('docs')} style={styles.actionItem}>
            <Feather name="file-text" size={18} color="#64748B" /><Text style={styles.actionText}>Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('referral')} style={styles.actionItem}>
            <Feather name="gift" size={18} color="#64748B" /><Text style={styles.actionText}>Refer & Earn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditData({
                accountHolder: dbData.accountHolder,
                bankAccount:   dbData.bankAccount,
                ifscCode:      dbData.ifscCode,
                bankBranch:    dbData.bankBranch,
                upiId:         dbData.upiId,
              });
              setActiveModal('bank');
            }}
            style={styles.actionItem}
          >
            <NativeIcon name="credit-card" size={18} color="#64748B" /><Text style={styles.actionText}>Bank Details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('support')} style={[styles.actionItem, {borderColor: '#BBF7D0'}]}>
            <Feather name="help-circle" size={18} color="#16A34A" /><Text style={[styles.actionText, {color: '#16A34A'}]}>Help / Support</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('emergency')} style={[styles.actionItem, {borderColor: '#FECACA', backgroundColor: '#FEF2F2'}]}>
            <Feather name="alert-circle" size={18} color="#DC2626" /><Text style={[styles.actionText, {color: '#DC2626'}]}>Emergency SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSignOut} 
            disabled={signingOut}
            style={[styles.actionItem, { marginTop: 32, borderWidth: 0, opacity: signingOut ? 0.6 : 1 }]}
          >
            {signingOut
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Feather name="log-out" size={18} color="#EF4444" />
            }
            <Text style={[styles.actionText, { color: '#EF4444' }]}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      {renderModal()}

      {/* Document Viewer Modal */}
      {docViewerModal.documentKey && (
        <DocumentViewerModal
          visible={docViewerModal.visible}
          documentName={
            ({
              aadhar: 'Aadhaar Card',
              pan: 'PAN Card',
              license: 'Driving License',
              rc: 'RC Book'
            } as any)[docViewerModal.documentKey] || 'Document'
          }
          documentKey={docViewerModal.documentKey}
          frontImageUri={dbData.documents[docViewerModal.documentKey]?.front || null}
          backImageUri={dbData.documents[docViewerModal.documentKey]?.back || null}
          status={dbData.documents[docViewerModal.documentKey]?.status || 'pending'}
          rejectionReason={dbData.documents[docViewerModal.documentKey]?.rejection_reason || null}
          onFrontSelected={(uri: string) => {
            const key = docViewerModal.documentKey;
            if (!key) return;
            setDbData((prev: any) => ({
              ...prev,
              documents: {
                ...prev.documents,
                [key]: {
                  ...prev.documents[key],
                  front: uri
                }
              }
            }));
          }}
          onBackSelected={(uri: string) => {
            const key = docViewerModal.documentKey;
            if (!key) return;
            setDbData((prev: any) => ({
              ...prev,
              documents: {
                ...prev.documents,
                [key]: {
                  ...prev.documents[key],
                  back: uri
                }
              }
            }));
          }}
          onClose={() => setDocViewerModal({ visible: false, documentKey: null })}
          isDark={isDark}
          onSave={async () => {
            try {
              const docKey = docViewerModal.documentKey;
              if (docKey) {
                const docData = dbData.documents[docKey];
                // Call API to update document
                const result = await DriverAPI.updateDocument(docKey, {
                  front: docData.front,
                  back: docData.back
                });
                if (result.success) {
                  Alert.alert('Success', 'Document updated successfully!');
                  // Reload profile data
                  loadProfileData();
                } else {
                  Alert.alert('Error', result.message || 'Failed to update document');
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update document');
            }
          }}
        />
      )}

      {/* WALLET FULL-SCREEN MODAL */}
      <Modal visible={isWalletOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsWalletOpen(false)}>
        <WalletView onClose={() => setIsWalletOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — identical to original
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollPad: { padding: 20, paddingBottom: 60 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 2 },
  profileInfo: { marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  ratingText: { color: '#F59E0B', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  driverIdText: { fontSize: 12, color: '#64748B' },
  topStatsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statHero: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statHeroLabel: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  statHeroValue: { fontSize: 24, fontWeight: '900', marginTop: 8 },
  statHeroSub: { fontSize: 12 },
  pilotCard: { padding: 20, borderRadius: 24, borderWidth: 2, marginBottom: 24, elevation: 1 },
  pilotCardActive: { borderColor: '#FCD34D' },
  pilotCardNormal: { borderColor: '#E2E8F0' },
  pilotIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  pilotTitle: { fontSize: 16, fontWeight: '900' },
  pilotSub: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  pilotBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pilotBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  pilotProgressLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  pilotProgressValue: { fontSize: 18, fontWeight: '900', color: '#334155' },
  pilotTrack: { height: 12, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 6, marginVertical: 12 },
  pilotFill: { height: 12, borderRadius: 6 },
  pilotCongratsText: { fontSize: 14, fontWeight: 'bold', color: '#B45309', marginLeft: 8 },
  pilotNeedText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  rankBtn: { backgroundColor: '#FAF5FF', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#E9D5FF', marginBottom: 16 },
  rankBtnTitle: { fontWeight: 'bold', color: '#0F172A' },
  rankBtnSub: { fontSize: 12, fontWeight: 'bold', color: '#7E22CE' },
  voiceBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, borderWidth: 2, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voiceBtnOn: { backgroundColor: '#F0F9FF', borderColor: '#0284C7' },
  voiceBtnOff: { borderColor: '#E2E8F0' },
  voiceBtnText: { fontWeight: 'bold', marginLeft: 12 },
  switchBtn: { width: 40, height: 20, borderRadius: 10, justifyContent: 'center' },
  switchOn: { backgroundColor: '#0284C7' },
  switchOff: { backgroundColor: '#CBD5E1' },
  switchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF' },
  knobOn: { transform: [{translateX: 22}] },
  knobOff: { transform: [{translateX: 2}] },
  walletBtn: { backgroundColor: '#0F172A', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, elevation: 4 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  walletLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  walletValue: { fontSize: 20, color: '#FFF', fontWeight: '900' },
  walletViewBtn: { backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  walletViewText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  actionList: { gap: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0' },
  actionText: { fontWeight: 'bold', color: '#475569', marginLeft: 12, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: height * 0.85 },
  modalHandle: { width: 48, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  closeBtnPrimary: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  rankHeroCard: { padding: 20, borderRadius: 16, marginBottom: 24 },
  rankSubText: { fontSize: 12, fontWeight: 'bold', opacity: 0.8 },
  rankHeroText: { fontSize: 24, fontWeight: '900' },
  rankHeroIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  progressBarBgLight: { height: 12, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 6, marginVertical: 8 },
  progressBarFillLight: { height: 12, borderRadius: 6 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#0F172A' },
  pathContainer: { marginLeft: 16 },
  pathRow: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  pathLine: { position: 'absolute', left: 15, top: 32, bottom: -24, width: 2, backgroundColor: '#E2E8F0' },
  pathDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF', zIndex: 10 },
  pathCard: { flex: 1, marginLeft: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  pathCardTitle: { fontSize: 16, fontWeight: 'bold' },
  currentBadge: { backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 10, fontWeight: 'bold' },
  pathCardSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  tabsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  tabActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  tabInactive: { borderColor: '#E2E8F0' },
  tabText: { fontWeight: 'bold', textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  statLabel: { fontSize: 10, fontWeight: 'bold' },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  graphCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 20, height: 200 },
  graphContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8 },
  barCol: { alignItems: 'center', flex: 1 },
  barWrap: { width: '60%', height: '100%', justifyContent: 'flex-end' },
  barFill: { backgroundColor: '#0284C7', borderTopLeftRadius: 4, borderTopRightRadius: 4, width: '100%' },
  barLabel: { fontSize: 10, color: '#64748B', fontWeight: 'bold', marginTop: 8 },
  leaderboardList: { maxHeight: 400 },
  leaderCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  leaderCardMe: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  leaderCardNormal: { backgroundColor: '#FFF', borderColor: '#E2E8F0' },
  rankBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankTop: { backgroundColor: '#D97706' },
  // First redundant block of styles removed
  // viewRow etc removed
  rankNormal: { backgroundColor: '#F1F5F9' },
  rankNum: { fontWeight: '900', color: '#475569' },
  leaderName: { fontWeight: 'bold', fontSize: 16, color: '#0F172A' },
  leaderStats: { fontSize: 12, color: '#64748B' },
  rankDisplay: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8' },
  docList: { gap: 12 },
  docCardContainer: { paddingVertical: 4 },
  docIntroMsg: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  docName: { fontWeight: 'bold', fontSize: 14, color: '#0F172A' },
  docSub: { fontSize: 12, color: '#64748B' },
  docBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  docBtnText: { color: '#0284C7', fontSize: 10, fontWeight: 'bold' },
  docMissing: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  docMissingText: { color: '#64748B', fontSize: 10, fontWeight: 'bold' },
  bankCardBg: { backgroundColor: '#0F172A', padding: 24, borderRadius: 16, marginBottom: 16 },
  bankLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
  bankAccNum: { fontSize: 24, fontWeight: '900', color: '#FFF', marginVertical: 24, letterSpacing: 2 },
  bankSubLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  bankSubValue: { fontSize: 14, color: '#FFF', fontWeight: 'bold' },
  bankDetailsBox: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16 },
  bankBoxTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 12, textTransform: 'uppercase' },
  bankRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 },
  bankIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bankRowLabel: { fontSize: 12, color: '#64748B' },
  bankRowValue: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  vehCardHero: { backgroundColor: '#EFF6FF', padding: 20, borderRadius: 16, borderColor: '#BFDBFE', borderWidth: 2, marginBottom: 16 },
  vehHeroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  vehHeroLabel: { fontSize: 12, fontWeight: 'bold', color: '#1D4ED8' },
  vehHeroValue: { fontSize: 18, fontWeight: '900', color: '#1E3A8A', textTransform: 'capitalize' },
  vehGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  vehBox: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16 },
  vehBoxLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 4 },
  vehBoxValue: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  vehStatusBox: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16 },
  statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
  statusTextGreen: { fontSize: 14, fontWeight: 'bold', color: '#16A34A' },
  refCard: { backgroundColor: '#FFFBEB', padding: 24, borderRadius: 16, borderWidth: 2, borderColor: '#FDE68A', marginBottom: 16 },
  refLabel: { fontSize: 14, fontWeight: 'bold', color: '#B45309', marginBottom: 8 },
  refRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  refCodeBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, padding: 12, alignItems: 'center', justifyContent: 'center' },
  refCodeText: { fontSize: 24, fontWeight: '900', color: '#D97706', letterSpacing: 2 },
  refCopyBtn: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  refSub: { fontSize: 12, color: '#D97706' },
  notifList: { gap: 12 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  notifLabel: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textTransform: 'capitalize' },
  suppList: { gap: 12 },
  suppBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  suppBtnText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  suppCallBox: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  suppCallLabel: { fontSize: 14, fontWeight: 'bold', color: '#15803D', marginBottom: 8 },
  suppCallNum: { fontSize: 24, fontWeight: '900', color: '#16A34A' },
  sosCard: { backgroundColor: '#FEF2F2', padding: 24, borderRadius: 16, borderWidth: 2, borderColor: '#FECACA', marginBottom: 16, alignItems: 'center', width: '100%' },
  sosSub: { fontSize: 14, color: '#B91C1C', textAlign: 'center', marginBottom: 16 },
  sosBtn: { backgroundColor: '#DC2626', width: '100%', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  sosBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sosLinks: { gap: 8, width: '100%' },
  sosLinkBtn: { padding: 16, backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sosLinkText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },

  // ── View / Edit toggle ─────────────────────────────────────────────
  pencilBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#BFDBFE' },
  pencilBtnText: { fontSize: 13, fontWeight: '700', color: '#0284C7' },
  backIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  viewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  viewRowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  viewRowLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  viewRowValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // ── Edit form ──────────────────────────────────────────────────────────
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  editPersonalBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  editPersonalBtnText: { fontSize: 11, fontWeight: '700', color: '#0284C7' },
  editFieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  editFieldInput: { height: 52, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  editChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  editChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  editChipActive: { borderColor: '#0284C7', backgroundColor: '#EFF6FF' },
  editChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0284C7', paddingVertical: 16, borderRadius: 14, marginTop: 16, shadowColor: '#0284C7', shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
