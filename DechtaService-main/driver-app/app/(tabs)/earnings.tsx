// app/(tabs)/earnings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { EarningsAPI } from '../../services/api';

// ── Types ──────────────────────────────────────────────────────
type Timeframe = 'daily' | 'weekly' | 'monthly' | 'custom';

interface Trip {
  id:           string;
  type:         string;
  customerName: string;
  date:         string;
  gross:        number;
  commission:   number;
  net:          number;
  commissionPct: number;
}

interface EarningsSummary {
  gross:      number;
  commission: number;
  net:        number;
}

// ── Calendar helpers (unchanged from original) ──────────────────
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAYS = ['S','M','T','W','T','F','S'];

function MiniCalendar({ selectedDate, onSelect, highlightStart, highlightEnd }: {
  selectedDate: string | null;
  onSelect: (d: string) => void;
  highlightStart?: string | null;
  highlightEnd?:   string | null;
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonth   = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth   = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };
  const toKey       = (y: number, m: number, d: number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isInRange   = (k: string) => !!(highlightStart && highlightEnd && k >= highlightStart && k <= highlightEnd);
  const cells: (number|null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={cal.wrapper}>
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Feather name="chevron-left"  size={18} color="#0284C7" /></TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}><Feather name="chevron-right" size={18} color="#0284C7" /></TouchableOpacity>
      </View>
      <View style={cal.dayRow}>{DAYS.map((d, i) => <Text key={i} style={cal.dayHdr}>{d}</Text>)}</View>
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e-${idx}`} style={cal.cell} />;
          const key = toKey(viewYear, viewMonth, day);
          const isStart = key === highlightStart, isEnd = key === highlightEnd;
          const inRange = isInRange(key), isSelected = key === selectedDate;
          return (
            <TouchableOpacity key={key} style={[cal.cell, inRange && cal.rangeCell, (isStart||isEnd||isSelected) && cal.selectedCell]} onPress={() => onSelect(key)}>
              <Text style={[cal.dayNum, (isStart||isEnd||isSelected) && cal.selectedDayNum, inRange && !isStart && !isEnd && cal.rangeDayNum]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrapper:      { paddingHorizontal: 4 },
  navRow:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  navBtn:       { width:36, height:36, borderRadius:18, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center' },
  monthLabel:   { fontSize:15, fontWeight:'700', color:'#0F172A' },
  dayRow:       { flexDirection:'row', marginBottom:6 },
  dayHdr:       { flex:1, textAlign:'center', fontSize:11, fontWeight:'700', color:'#94A3B8', textTransform:'uppercase' },
  grid:         { flexDirection:'row', flexWrap:'wrap' },
  cell:         { width:`${100/7}%`, aspectRatio:1, alignItems:'center', justifyContent:'center', marginVertical:1 },
  rangeCell:    { backgroundColor:'#DBEAFE' },
  selectedCell: { backgroundColor:'#0284C7', borderRadius:20 },
  dayNum:       { fontSize:13, fontWeight:'600', color:'#334155' },
  selectedDayNum:{ color:'#FFF', fontWeight:'800' },
  rangeDayNum:  { color:'#1D4ED8' },
});

// ── Date Picker Modal (unchanged) ───────────────────────────────
function DatePickerModal({ visible, timeframe, onClose, onApply }: {
  visible: boolean; timeframe: Timeframe; onClose: () => void;
  onApply: (d: { date?: string; week?: string; month?: string; start?: string; end?: string }) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [rangeStart,   setRangeStart]   = useState<string|null>(null);
  const [rangeEnd,     setRangeEnd]     = useState<string|null>(null);
  const [pickingEnd,   setPickingEnd]   = useState(false);
  const formatDisplay = (d: string) => { const [y,m,day] = d.split('-'); return `${day} ${MONTHS[parseInt(m)-1].slice(0,3)} ${y}`; };
  const handleCustomSelect = (date: string) => {
    if (!pickingEnd) { setRangeStart(date); setRangeEnd(null); setPickingEnd(true); }
    else { if (date < (rangeStart??'')) { setRangeStart(date); setRangeEnd(rangeStart); } else setRangeEnd(date); setPickingEnd(false); }
  };
  const canApply = () => timeframe === 'custom' ? !!(rangeStart && rangeEnd) : !!selectedDate;
  const handleApply = () => {
    if (timeframe === 'custom')    onApply({ start: rangeStart!, end: rangeEnd! });
    else if (timeframe === 'daily')   onApply({ date: selectedDate! });
    else if (timeframe === 'weekly')  onApply({ week: selectedDate! });
    else                              onApply({ month: selectedDate! });
  };
  const title = timeframe==='daily' ? 'Select a Date' : timeframe==='weekly' ? 'Select Week' : timeframe==='monthly' ? 'Select Month' : 'Select Custom Range';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>{title}</Text>
          {timeframe === 'custom' ? (
            <>
              <View style={modal.rangeHint}>
                <View style={modal.rangeTag}><Feather name="corner-down-right" size={12} color="#0284C7" /><Text style={modal.rangeTagLabel}>From</Text><Text style={modal.rangeTagValue}>{rangeStart ? formatDisplay(rangeStart) : '—'}</Text></View>
                <View style={modal.rangeDivider} />
                <View style={modal.rangeTag}><Feather name="corner-down-left" size={12} color="#0284C7" /><Text style={modal.rangeTagLabel}>To</Text><Text style={modal.rangeTagValue}>{rangeEnd ? formatDisplay(rangeEnd) : pickingEnd ? 'pick end' : '—'}</Text></View>
              </View>
              <MiniCalendar selectedDate={null} onSelect={handleCustomSelect} highlightStart={rangeStart} highlightEnd={rangeEnd} />
            </>
          ) : (
            <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
          )}
          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}><Text style={modal.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[modal.applyBtn, !canApply() && modal.applyDisabled]} onPress={handleApply} disabled={!canApply()}>
              <LinearGradient colors={['#0284C7','#1E3A8A']} style={modal.applyGradient}><Text style={modal.applyText}>Apply</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#FFF', borderTopLeftRadius:28, borderTopRightRadius:28, padding:20, paddingBottom:40 },
  handle: { width:40, height:4, backgroundColor:'#E2E8F0', borderRadius:2, alignSelf:'center', marginBottom:20 },
  title: { fontSize:17, fontWeight:'700', color:'#0F172A', textAlign:'center', marginBottom:20 },
  rangeHint: { flexDirection:'row', alignItems:'center', backgroundColor:'#F0F9FF', borderRadius:14, padding:12, marginBottom:16, gap:8 },
  rangeTag: { flex:1, flexDirection:'row', alignItems:'center', gap:6 },
  rangeTagLabel: { fontSize:11, fontWeight:'700', color:'#0284C7', textTransform:'uppercase' },
  rangeTagValue: { fontSize:12, fontWeight:'600', color:'#1E293B' },
  rangeDivider: { width:1, height:20, backgroundColor:'#BAE6FD' },
  actions: { flexDirection:'row', gap:12, marginTop:24 },
  cancelBtn: { flex:1, paddingVertical:14, backgroundColor:'#F1F5F9', borderRadius:16, alignItems:'center' },
  cancelText: { fontSize:15, fontWeight:'700', color:'#64748B' },
  applyBtn: { flex:2, borderRadius:16, overflow:'hidden' },
  applyDisabled: { opacity:0.4 },
  applyGradient: { paddingVertical:14, alignItems:'center' },
  applyText: { fontSize:15, fontWeight:'700', color:'#FFF' },
});

// ── Helpers ─────────────────────────────────────────────────────
const formatKey = (k: string) => { const [y,m,d] = k.split('-'); return `${d} ${MONTHS[parseInt(m)-1].slice(0,3)} ${y}`; };
const getWeekRange = (dateKey: string) => {
  const d = new Date(dateKey), day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const toK = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return { start: toK(mon), end: toK(sun) };
};
const getMonthLabel  = (k: string) => { const [y,m] = k.split('-'); return `${MONTHS[parseInt(m)-1]} ${y}`; };
const todayKey       = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const fmt            = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ═══════════════════════════════════════════════════════════════
// COMMISSION SUMMARY CARD
// ═══════════════════════════════════════════════════════════════
function CommissionCard({ gross, commission, net, commissionPct, tripCount }: {
  gross: number; commission: number; net: number; commissionPct: number; tripCount: number;
}) {
  return (
    <View style={cc.card}>
      {/* Header */}
      <View style={cc.header}>
        <View style={cc.headerLeft}>
          <View style={cc.iconBox}><Feather name="percent" size={16} color="#0284C7" /></View>
          <View>
            <Text style={cc.title}>Earnings Breakdown</Text>
            <Text style={cc.subtitle}>{commissionPct}% platform commission on {tripCount} trip{tripCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      {/* Three rows: Gross → Commission → Net */}
      <View style={cc.rows}>

        {/* Gross */}
        <View style={cc.row}>
          <View style={cc.rowLeft}>
            <View style={[cc.dot, { backgroundColor: '#DBEAFE' }]} />
            <Text style={cc.rowLabel}>Gross Earnings</Text>
            <Text style={cc.rowHint}>(total delivery fees)</Text>
          </View>
          <Text style={cc.grossAmt}>{fmt(gross)}</Text>
        </View>

        {/* Arrow divider */}
        <View style={cc.dividerRow}>
          <View style={cc.dividerLine} />
          <View style={cc.dividerBadge}>
            <Feather name="minus" size={10} color="#EF4444" />
            <Text style={cc.dividerText}>Commission {commissionPct}%</Text>
          </View>
          <View style={cc.dividerLine} />
        </View>

        {/* Commission */}
        <View style={cc.row}>
          <View style={cc.rowLeft}>
            <View style={[cc.dot, { backgroundColor: '#FEE2E2' }]} />
            <Text style={cc.rowLabel}>Platform Commission</Text>
            <Text style={cc.rowHint}>({commissionPct}% deducted)</Text>
          </View>
          <Text style={cc.commAmt}>− {fmt(commission)}</Text>
        </View>

        {/* Net divider */}
        <View style={cc.dividerRow}>
          <View style={cc.dividerLine} />
          <View style={[cc.dividerBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Feather name="check" size={10} color="#16A34A" />
            <Text style={[cc.dividerText, { color: '#16A34A' }]}>Your earnings</Text>
          </View>
          <View style={cc.dividerLine} />
        </View>

        {/* Net */}
        <View style={[cc.row, cc.netRow]}>
          <View style={cc.rowLeft}>
            <View style={[cc.dot, { backgroundColor: '#DCFCE7' }]} />
            <Text style={[cc.rowLabel, cc.netLabel]}>Net Payout</Text>
            <Text style={cc.rowHint}>(credited to wallet)</Text>
          </View>
          <Text style={cc.netAmt}>{fmt(net)}</Text>
        </View>

      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  card:        { backgroundColor:'#FFF', borderRadius:20, borderWidth:1, borderColor:'#E2E8F0', marginBottom:20, overflow:'hidden' },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  headerLeft:  { flexDirection:'row', alignItems:'center', gap:10 },
  iconBox:     { width:36, height:36, borderRadius:10, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center' },
  title:       { fontSize:14, fontWeight:'700', color:'#0F172A' },
  subtitle:    { fontSize:11, color:'#64748B', marginTop:2 },
  rows:        { padding:16, gap:4 },
  row:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10 },
  netRow:      { backgroundColor:'#F0FDF4', borderRadius:12, paddingHorizontal:12, marginTop:4 },
  rowLeft:     { flexDirection:'row', alignItems:'center', gap:8, flex:1 },
  dot:         { width:10, height:10, borderRadius:5 },
  rowLabel:    { fontSize:13, fontWeight:'600', color:'#334155' },
  netLabel:    { color:'#15803D' },
  rowHint:     { fontSize:10, color:'#94A3B8' },
  grossAmt:    { fontSize:16, fontWeight:'700', color:'#1E40AF' },
  commAmt:     { fontSize:16, fontWeight:'700', color:'#DC2626' },
  netAmt:      { fontSize:18, fontWeight:'900', color:'#15803D' },
  dividerRow:  { flexDirection:'row', alignItems:'center', gap:8, marginVertical:4 },
  dividerLine: { flex:1, height:1, backgroundColor:'#F1F5F9' },
  dividerBadge:{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#FEF2F2', borderWidth:1, borderColor:'#FECACA', borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
  dividerText: { fontSize:10, fontWeight:'700', color:'#EF4444' },
});

// ═══════════════════════════════════════════════════════════════
// MAIN EARNINGS SCREEN
// ═══════════════════════════════════════════════════════════════
export default function EarningsScreen() {
  const [timeframe,       setTimeframe]       = useState<Timeframe>('daily');
  const [isLoading,       setIsLoading]       = useState(false);
  const [pastTrips,       setPastTrips]       = useState<Trip[]>([]);
  const [summary,         setSummary]         = useState<EarningsSummary>({ gross: 0, commission: 0, net: 0 });
  const [commissionPct,   setCommissionPct]   = useState(10);
  const [pickerVisible,   setPickerVisible]   = useState(false);
  const [displayLabel,    setDisplayLabel]    = useState(() => formatKey(todayKey()));
  const [queryDate,       setQueryDate]       = useState<string>(todayKey());
  const [queryStartDate,  setQueryStartDate]  = useState<string|null>(null);
  const [queryEndDate,    setQueryEndDate]    = useState<string|null>(null);

  const fetchEarnings = useCallback(async () => {
    if (timeframe === 'custom' && (!queryStartDate || !queryEndDate)) { setPastTrips([]); return; }
    setIsLoading(true);
    try {
      const result = await EarningsAPI.get(
        timeframe,
        (timeframe !== 'custom' ? queryDate : undefined) as any,
        (timeframe === 'custom' ? queryStartDate : undefined) as any,
        (timeframe === 'custom' ? queryEndDate   : undefined) as any,
      );
      if (result.success && result.data) {
        const d = result.data;
        setSummary({ gross: d.totalGross || 0, commission: d.totalCommission || 0, net: d.totalNet || 0 });
        setCommissionPct(d.commissionRatePct || 10);
        setPastTrips((d.trips || []).map((t: any) => ({
          id:            String(t.id),
          type:          t.type          || 'Delivery',
          customerName:  t.customerName  || '',
          date:          t.date          || '',
          gross:         t.gross         || 0,
          commission:    t.commission    || 0,
          net:           t.net           || 0,
          commissionPct: t.commissionPct || 10,
        })));
      } else {
        setPastTrips([]);
        setSummary({ gross: 0, commission: 0, net: 0 });
      }
    } catch {
      setPastTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, queryDate, queryStartDate, queryEndDate]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  useEffect(() => {
    const today = todayKey();
    setQueryDate(today); setQueryStartDate(null); setQueryEndDate(null);
    if      (timeframe === 'daily')   setDisplayLabel(formatKey(today));
    else if (timeframe === 'weekly')  { const { start, end } = getWeekRange(today); setDisplayLabel(`${formatKey(start)} – ${formatKey(end)}`); }
    else if (timeframe === 'monthly') setDisplayLabel(getMonthLabel(today));
    else                              setDisplayLabel('Select range');
  }, [timeframe]);

  const handlePickerApply = (data: { date?: string; week?: string; month?: string; start?: string; end?: string }) => {
    setPickerVisible(false);
    if      (data.date)           { setQueryDate(data.date); setDisplayLabel(formatKey(data.date)); }
    else if (data.week)           { const { start, end } = getWeekRange(data.week); setQueryDate(data.week); setDisplayLabel(`${formatKey(start)} – ${formatKey(end)}`); }
    else if (data.month)          { setQueryDate(data.month); setDisplayLabel(getMonthLabel(data.month)); }
    else if (data.start && data.end) { setQueryStartDate(data.start); setQueryEndDate(data.end); setDisplayLabel(`${formatKey(data.start)} – ${formatKey(data.end)}`); }
  };

  const TABS: { key: Timeframe; label: string }[] = [
    { key: 'daily', label: 'Day' }, { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' }, { key: 'custom', label: 'Custom' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Earnings</Text>

        {/* Timeframe tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity key={key} onPress={() => setTimeframe(key)}
              style={[styles.tabBtn, timeframe === key ? styles.tabActive : styles.tabInactive]}>
              <Text style={[styles.tabText, timeframe === key ? styles.tabTextActive : styles.tabTextInactive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date selector */}
        <TouchableOpacity style={styles.dateSelector} onPress={() => setPickerVisible(true)}>
          <View style={styles.rowCenter}>
            <View style={styles.calIconBox}><Feather name="calendar" size={16} color="#0284C7" /></View>
            <Text style={styles.dateText} numberOfLines={1}>{displayLabel}</Text>
          </View>
          <View style={styles.editChip}>
            <Feather name="edit-2" size={12} color="#0284C7" />
            <Text style={styles.editChipText}>Change</Text>
          </View>
        </TouchableOpacity>

        {/* Hero card — shows NET earnings prominently */}
        <LinearGradient colors={['#0369A1','#1E3A8A']} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroSubtitle}>{timeframe.toUpperCase()} NET EARNINGS</Text>
                <Text style={styles.heroAmount}>{fmt(summary.net)}</Text>
                <Text style={styles.heroGrossLine}>Gross {fmt(summary.gross)} · Commission {fmt(summary.commission)}</Text>
              </View>
              <View style={styles.statsPill}>
                <Feather name="trending-up" size={14} color="#4ADE80" />
                <Text style={styles.statsText}>{pastTrips.length} trips</Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>GROSS</Text>
                <Text style={styles.metaValue}>{fmt(summary.gross)}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>COMMISSION</Text>
                <Text style={[styles.metaValue, { color: '#FCA5A5' }]}>− {fmt(summary.commission)}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>YOUR PAYOUT</Text>
                <Text style={[styles.metaValue, { color: '#4ADE80' }]}>{fmt(summary.net)}</Text>
              </View>
            </View>
          </View>
          <Feather name="bar-chart-2" size={130} color="rgba(255,255,255,0.06)" style={styles.heroBgIcon} />
        </LinearGradient>

        {/* Commission breakdown card */}
        {pastTrips.length > 0 && (
          <CommissionCard
            gross={summary.gross}
            commission={summary.commission}
            net={summary.net}
            commissionPct={commissionPct}
            tripCount={pastTrips.length}
          />
        )}

        {/* Trip list */}
        <Text style={styles.listTitle}>Completed Trips</Text>
        <View style={styles.listContainer}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Loading trips...</Text>
            </View>
          ) : pastTrips.length > 0 ? (
            pastTrips.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                {/* Left: icon + info */}
                <View style={styles.tripLeft}>
                  <View style={styles.tripIconBox}>
                    <Feather name="check-circle" size={20} color="#16A34A" />
                  </View>
                  <View style={styles.tripDetails}>
                    <Text style={styles.tripType} numberOfLines={1}>{trip.type}</Text>
                    {trip.customerName ? <Text style={styles.tripCustomer} numberOfLines={1}>{trip.customerName}</Text> : null}
                    <Text style={styles.tripDate}>{trip.date}</Text>
                  </View>
                </View>

                {/* Right: gross → commission → net */}
                <View style={styles.tripRight}>
                  <Text style={styles.tripGross}>{fmt(trip.gross)}</Text>
                  <Text style={styles.tripComm}>− {fmt(trip.commission)} ({trip.commissionPct}%)</Text>
                  <View style={styles.tripNetRow}>
                    <Text style={styles.tripNet}>{fmt(trip.net)}</Text>
                    <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Feather name="clipboard" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No trips found</Text>
              <Text style={styles.emptySub}>Select a date using the calendar above.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <DatePickerModal
        visible={pickerVisible}
        timeframe={timeframe}
        onClose={() => setPickerVisible(false)}
        onApply={handlePickerApply}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#F8FAFC' },
  scrollPad:      { padding:20, paddingBottom:60 },
  rowCenter:      { flexDirection:'row', alignItems:'center', flex:1 },
  pageTitle:      { fontSize:28, fontWeight:'800', color:'#0F172A', marginBottom:20 },
  tabsContainer:  { flexDirection:'row', backgroundColor:'#F1F5F9', padding:5, borderRadius:16, marginBottom:14 },
  tabBtn:         { flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', justifyContent:'center' },
  tabActive:      { backgroundColor:'#FFF', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:3, elevation:3 },
  tabInactive:    { backgroundColor:'transparent' },
  tabText:        { fontSize:13, fontWeight:'700' },
  tabTextActive:  { color:'#0284C7' },
  tabTextInactive:{ color:'#94A3B8' },
  dateSelector:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#FFF', borderWidth:1.5, borderColor:'#DBEAFE', borderRadius:16, paddingVertical:13, paddingHorizontal:14, marginBottom:20 },
  calIconBox:     { width:32, height:32, borderRadius:10, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center', marginRight:10 },
  dateText:       { fontSize:14, fontWeight:'700', color:'#1E293B', flex:1 },
  editChip:       { flexDirection:'row', alignItems:'center', backgroundColor:'#EFF6FF', paddingHorizontal:10, paddingVertical:5, borderRadius:20, gap:4 },
  editChipText:   { fontSize:12, fontWeight:'700', color:'#0284C7' },
  heroCard:       { borderRadius:24, padding:22, overflow:'hidden', position:'relative', marginBottom:20, shadowColor:'#0369A1', shadowOffset:{width:0,height:8}, shadowOpacity:0.25, shadowRadius:16, elevation:10 },
  heroContent:    { zIndex:10 },
  heroTopRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  heroSubtitle:   { color:'#BAE6FD', fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:4 },
  heroAmount:     { fontSize:38, fontWeight:'900', color:'#FFF' },
  heroGrossLine:  { fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:4 },
  statsPill:      { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(74,222,128,0.15)', paddingHorizontal:10, paddingVertical:5, borderRadius:20, gap:4 },
  statsText:      { fontSize:12, fontWeight:'700', color:'#4ADE80' },
  heroMeta:       { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.1)', borderRadius:16, padding:14, alignItems:'center' },
  metaItem:       { flex:1, alignItems:'center' },
  metaLabel:      { color:'#BAE6FD', fontSize:8, fontWeight:'800', letterSpacing:0.8, marginBottom:4 },
  metaValue:      { color:'#FFF', fontSize:14, fontWeight:'800' },
  metaDivider:    { width:1, height:30, backgroundColor:'rgba(255,255,255,0.15)' },
  heroBgIcon:     { position:'absolute', right:-20, top:-10, transform:[{rotate:'-10deg'}] },
  listTitle:      { fontSize:18, fontWeight:'800', color:'#1E293B', marginBottom:14 },
  listContainer:  { flex:1 },
  loadingBox:     { paddingVertical:40, alignItems:'center', justifyContent:'center' },
  loadingText:    { marginTop:12, fontSize:14, fontWeight:'700', color:'#0284C7' },
  emptyBox:       { paddingVertical:50, alignItems:'center', justifyContent:'center', backgroundColor:'#FFF', borderRadius:24, borderWidth:1, borderColor:'#F1F5F9' },
  emptyTitle:     { fontSize:16, fontWeight:'700', color:'#64748B' },
  emptySub:       { fontSize:12, color:'#94A3B8', marginTop:4, textAlign:'center', paddingHorizontal:20 },
  tripCard:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#FFF', padding:16, borderRadius:20, borderWidth:1, borderColor:'#F1F5F9', marginBottom:10, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:3, elevation:1 },
  tripLeft:       { flexDirection:'row', alignItems:'center', flex:1, paddingRight:12 },
  tripIconBox:    { width:44, height:44, borderRadius:22, backgroundColor:'#F0FDF4', alignItems:'center', justifyContent:'center', marginRight:12 },
  tripDetails:    { flex:1 },
  tripType:       { fontSize:14, fontWeight:'700', color:'#0F172A', marginBottom:2 },
  tripCustomer:   { fontSize:11, color:'#64748B', marginBottom:1 },
  tripDate:       { fontSize:11, color:'#94A3B8' },
  tripRight:      { alignItems:'flex-end', minWidth:110 },
  tripGross:      { fontSize:12, color:'#64748B', textDecorationLine:'line-through', marginBottom:1 },
  tripComm:       { fontSize:10, color:'#EF4444', marginBottom:3 },
  tripNetRow:     { flexDirection:'row', alignItems:'center', gap:6 },
  tripNet:        { fontSize:16, fontWeight:'900', color:'#0F172A' },
  paidBadge:      { backgroundColor:'#F0FDF4', paddingHorizontal:6, paddingVertical:2, borderRadius:6 },
  paidBadgeText:  { fontSize:9, fontWeight:'800', color:'#22C55E', letterSpacing:0.5 },
});
