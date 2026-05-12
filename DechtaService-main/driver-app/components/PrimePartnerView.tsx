import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, SafeAreaView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// TARGETS
// ─────────────────────────────────────────────────────────────────────────────
// Pilot Partner = 2 targets only (orders target removed)
const TARGET_LOGIN_HOURS = 38;   // online hours per week
const TARGET_SCORE       = 65;   // completion score out of 100

// ─────────────────────────────────────────────────────────────────────────────
// SCORE FORMULA
//   completionScore = (completedOrders / acceptedOrders) × 100
//   If driver accepted 0 orders → score is 0 (avoids division by zero)
//   Capped at 100 for display
// ─────────────────────────────────────────────────────────────────────────────
function calcScore(accepted: number, completed: number): number {
  if (accepted === 0) return 0;
  return Math.min(100, Math.round((completed / accepted) * 100));
}

function scoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= TARGET_SCORE) return { text: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' };
  if (score >= 50)           return { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
  return                            { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
}

function scoreLabel(score: number): string {
  if (score >= TARGET_SCORE) return 'Excellent';
  if (score >= 50)           return 'Needs Work';
  return 'Poor';
}

interface PrimePartnerProps {
  isOpen:           boolean;
  onClose:          () => void;
  weeklyOrders:     number;   // total orders completed this week
  weeklyAccepted:   number;   // orders accepted this week (for score calc)
  weeklyCompleted:  number;   // orders actually completed this week
  weeklyLoginHours: number;   // hours online this week (loginSeconds / 3600)
  isPilotThisWeek:  boolean;  // earned Pilot last week → active Pilot now
}

export default function PrimePartnerView({
  isOpen,
  onClose,
  weeklyOrders,
  weeklyAccepted,
  weeklyCompleted,
  weeklyLoginHours,
  isPilotThisWeek,
}: PrimePartnerProps) {

  // ── Derived values ────────────────────────────────────────────────────────
  const completionScore  = calcScore(weeklyAccepted, weeklyCompleted);
  const weeklyMissed     = Math.max(0, weeklyAccepted - weeklyCompleted);

  const loginPct         = Math.min(100, (weeklyLoginHours / TARGET_LOGIN_HOURS)   * 100);
  const scorePct         = Math.min(100, (completionScore  / TARGET_SCORE)         * 100);
  const loginHrsLeft     = Math.max(0, TARGET_LOGIN_HOURS - weeklyLoginHours);
  const scoreLeft        = Math.max(0, TARGET_SCORE       - completionScore);

  const loginReached     = weeklyLoginHours >= TARGET_LOGIN_HOURS;
  const scoreReached     = completionScore  >= TARGET_SCORE;
  const bothReached      = loginReached && scoreReached;   // only 2 targets now

  const sc              = scoreColor(completionScore);

  // How many more completions needed to hit target score
  const completionsNeeded = weeklyAccepted > 0
    ? Math.max(0, Math.ceil((TARGET_SCORE / 100) * weeklyAccepted) - weeklyCompleted)
    : 0;

  // ── Benefits ──────────────────────────────────────────────────────────────
  const benefits = [
    { id: 1, title: 'Higher Earnings',          desc: 'Earn up to 15% more on every delivery.',    icon: 'bar-chart-2' },
    { id: 2, title: 'Priority Support',          desc: 'Skip the queue with a dedicated helpline.', icon: 'phone-call'  },
    { id: 3, title: 'Health Insurance',          desc: 'Free medical cover up to ₹2 Lakhs.',        icon: 'activity'    },
    { id: 4, title: 'Zero Cancellation Penalty', desc: 'Cancel up to 2 orders/week penalty-free.',  icon: 'shield'      },
  ];

  const howItWorks = [
    { step: '1', text: 'Stay online at least 38 hrs this week.' },
    { step: '2', text: 'Maintain a Completion Score of 65 or above (completed ÷ accepted × 100).' },
    { step: '3', text: 'Hit both targets → you automatically become Pilot next week.' },
    { step: '4', text: 'Miss either target the next week → you return to Standard Partner.' },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false}>
      <View style={styles.container}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={isPilotThisWeek ? ['#F59E0B', '#D97706'] : ['#0284C7', '#1D4ED8']}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>QC LOGISTICS</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.crownBox}>
                <Feather
                  name={isPilotThisWeek ? 'award' : 'target'}
                  size={40}
                  color={isPilotThisWeek ? '#FDE047' : '#93C5FD'}
                />
              </View>
              <Text style={styles.headerTitle}>
                {isPilotThisWeek ? 'Pilot Partner 🎖️' : 'Become a Pilot'}
              </Text>
              <Text style={styles.headerSub}>
                {isPilotThisWeek
                  ? 'You earned Pilot status. Keep going to retain it!'
                  : 'Hit both weekly targets to earn Pilot next week.'}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

          {/* ── STATUS CARD ───────────────────────────────────────────────── */}
          <View style={styles.statusCard}>
            <View style={styles.statusTopRow}>
              <View>
                <Text style={styles.statusMetaLabel}>THIS WEEK&apos;S STATUS</Text>
                <Text style={[styles.statusValue, { color: isPilotThisWeek ? '#F59E0B' : '#0F172A' }]}>
                  {isPilotThisWeek ? 'Active Pilot ✦' : 'Standard Partner'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isPilotThisWeek ? '#FEF3C7' : '#F1F5F9' }]}>
                <Feather
                  name={isPilotThisWeek ? 'star' : 'user'}
                  size={18}
                  color={isPilotThisWeek ? '#D97706' : '#64748B'}
                />
              </View>
            </View>
            <View style={[
              styles.nextWeekBanner,
              bothReached
                ? { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }
                : { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }
            ]}>
              <Feather
                name={bothReached ? 'check-circle' : 'clock'}
                size={16}
                color={bothReached ? '#16A34A' : '#EA580C'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.nextWeekText, { color: bothReached ? '#15803D' : '#C2410C' }]}>
                {bothReached
                  ? "🎉 You'll be a Pilot next week!"
                  : isPilotThisWeek
                    ? "Complete both targets this week to retain Pilot status."
                    : "Complete both targets this week to be Pilot next week."}
              </Text>
            </View>
          </View>

          {/* ── THIS WEEK'S PROGRESS ──────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>This Week&apos;s Progress</Text>

          {/* COMPLETION SCORE CARD */}
          <View style={[styles.progressCard, { borderColor: sc.border, backgroundColor: sc.bg }]}>
            <View style={styles.progressCardHeader}>
              <View style={[styles.progressIconBox, { backgroundColor: scoreReached ? '#DCFCE7' : '#F1F5F9' }]}>
                <Feather name="trending-up" size={20} color={scoreReached ? '#16A34A' : '#94A3B8'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.progressCardTitle}>Completion Score</Text>
                <Text style={styles.progressCardSub}>Target: {TARGET_SCORE} or above · Max: 100</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.progressCount, { color: sc.text }]}>{completionScore}</Text>
                <View style={[styles.scoreLabelBadge, { backgroundColor: sc.border }]}>
                  <Text style={[styles.scoreLabelText, { color: sc.text }]}>{scoreLabel(completionScore)}</Text>
                </View>
              </View>
            </View>

            {/* Score bar with target marker */}
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={
                  scoreReached     ? ['#4ADE80', '#16A34A'] :
                  completionScore >= 50 ? ['#FCD34D', '#F59E0B'] :
                                    ['#FCA5A5', '#EF4444']
                }
                style={[styles.progressBarFill, { width: `${scorePct}%` }]}
              />
              {/* Vertical target line at 65 */}
              <View style={[styles.scoreTargetLine, { left: `${TARGET_SCORE}%` as any }]} />
            </View>
            <View style={styles.scoreBarLabels}>
              <Text style={styles.scoreBarEdge}>0</Text>
              <Text style={[styles.scoreBarMid, { color: sc.text }]}>Target: {TARGET_SCORE}</Text>
              <Text style={styles.scoreBarEdge}>100</Text>
            </View>

            {/* Formula breakdown */}
            <View style={styles.scoreBreakdown}>
              <Text style={styles.scoreBreakdownTitle}>HOW YOUR SCORE IS CALCULATED</Text>

              {/* Visual formula */}
              <View style={styles.scoreFormula}>
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaNumber}>{weeklyCompleted}</Text>
                  <Text style={styles.formulaLabel}>Completed</Text>
                </View>
                <Text style={styles.formulaOp}>÷</Text>
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaNumber}>{weeklyAccepted}</Text>
                  <Text style={styles.formulaLabel}>Accepted</Text>
                </View>
                <Text style={styles.formulaOp}>×</Text>
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaNumber}>100</Text>
                  <Text style={styles.formulaLabel}> </Text>
                </View>
                <Text style={styles.formulaOp}>=</Text>
                <View style={[styles.formulaResultBox, { backgroundColor: sc.border }]}>
                  <Text style={[styles.formulaResult, { color: sc.text }]}>{completionScore}</Text>
                </View>
              </View>

              {/* Mini breakdown stats */}
              <View style={styles.miniStatRow}>
                <View style={styles.miniStat}>
                  <View style={[styles.miniStatDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={styles.miniStatValue}>{weeklyAccepted}</Text>
                  <Text style={styles.miniStatLabel}>Accepted</Text>
                </View>
                <View style={styles.miniStat}>
                  <View style={[styles.miniStatDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={styles.miniStatValue}>{weeklyCompleted}</Text>
                  <Text style={styles.miniStatLabel}>Completed</Text>
                </View>
                <View style={styles.miniStat}>
                  <View style={[styles.miniStatDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.miniStatValue}>{weeklyMissed}</Text>
                  <Text style={styles.miniStatLabel}>Missed / Cancelled</Text>
                </View>
              </View>

              {/* Dynamic tip */}
              {!scoreReached && weeklyAccepted > 0 && completionsNeeded > 0 && (
                <View style={styles.hintBox}>
                  <Feather name="info" size={13} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.hintText}>
                    Complete {completionsNeeded} more of your accepted orders to reach score {TARGET_SCORE}.
                  </Text>
                </View>
              )}
              {weeklyAccepted === 0 && (
                <View style={styles.hintBox}>
                  <Feather name="info" size={13} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.hintText}>
                    Accept and complete orders this week to build your score.
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.progressFooter, { color: scoreReached ? '#16A34A' : '#64748B', marginTop: 6 }]}>
              {scoreReached ? '✓ Score target reached!' : `${scoreLeft} more points needed`}
            </Text>
          </View>

          {/* LOGIN HOURS CARD */}
          <View style={[styles.progressCard, {
            borderColor:     loginReached ? '#86EFAC' : '#F1F5F9',
            backgroundColor: loginReached ? '#F0FDF4' : '#FFFFFF',
          }]}>
            <View style={styles.progressCardHeader}>
              <View style={[styles.progressIconBox, { backgroundColor: loginReached ? '#DCFCE7' : '#F1F5F9' }]}>
                <Feather name="wifi" size={20} color={loginReached ? '#16A34A' : '#94A3B8'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.progressCardTitle}>Login Hours</Text>
                <Text style={styles.progressCardSub}>Target: {TARGET_LOGIN_HOURS} hrs online this week</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.progressCount, { color: loginReached ? '#16A34A' : '#0F172A' }]}>
                  {weeklyLoginHours.toFixed(1)}
                </Text>
                <Text style={styles.progressTotal}>/{TARGET_LOGIN_HOURS} hrs</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={loginReached ? ['#4ADE80', '#16A34A'] : ['#FBBF24', '#F59E0B']}
                style={[styles.progressBarFill, { width: `${loginPct}%` }]}
              />
            </View>
            <Text style={[styles.progressFooter, { color: loginReached ? '#16A34A' : '#64748B' }]}>
              {loginReached ? '✓ Target reached!' : `${loginHrsLeft.toFixed(1)} more hours to go`}
            </Text>
          </View>

          {/* HOW IT WORKS */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>How It Works</Text>
          <View style={styles.howCard}>
            {howItWorks.map((item, idx) => (
              <View
                key={item.step}
                style={[styles.howRow, idx < howItWorks.length - 1 && styles.howRowBorder]}
              >
                <View style={styles.howStepCircle}>
                  <Text style={styles.howStepText}>{item.step}</Text>
                </View>
                <Text style={styles.howItemText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* BENEFITS */}
          <Text style={styles.sectionTitle}>Pilot Benefits</Text>
          <View style={styles.benefitsList}>
            {benefits.map(benefit => (
              <View
                key={benefit.id}
                style={[styles.benefitCard, isPilotThisWeek ? styles.benefitUnlocked : styles.benefitLocked]}
              >
                <View style={styles.rowCenter}>
                  <View style={[styles.iconBox, isPilotThisWeek ? styles.iconBoxUnlocked : styles.iconBoxLocked]}>
                    {isPilotThisWeek ? (
                      <LinearGradient colors={['#FBBF24', '#F97316']} style={styles.iconGradient}>
                        <Feather name={benefit.icon as any} size={20} color="#FFF" />
                      </LinearGradient>
                    ) : (
                      <Feather name={benefit.icon as any} size={20} color="#94A3B8" />
                    )}
                  </View>
                  <View style={styles.benefitTextCont}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.benefitTitle, isPilotThisWeek ? { color: '#78350F' } : { color: '#0F172A' }]}>
                        {benefit.title}
                      </Text>
                      {isPilotThisWeek && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  rowCenter:  { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  headerGradient: { borderBottomLeftRadius: 48, borderBottomRightRadius: 48, paddingBottom: 40, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  headerTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  brandBadge:     { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  brandBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  headerCenter:   { alignItems: 'center', marginTop: 20 },
  crownBox:       { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle:    { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 6 },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },

  scrollArea: { flex: 1, paddingHorizontal: 20 },

  statusCard:      { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginTop: -30, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  statusTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusMetaLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  statusValue:     { fontSize: 20, fontWeight: '900' },
  statusBadge:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  nextWeekBanner:  { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5 },
  nextWeekText:    { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 12, marginLeft: 2 },

  progressCard:       { borderRadius: 20, padding: 18, borderWidth: 1.5, marginBottom: 12 },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  progressIconBox:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progressCardTitle:  { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  progressCardSub:    { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  progressCount:      { fontSize: 26, fontWeight: '900' },
  progressTotal:      { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
  progressBarBg:      { height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden', marginBottom: 4, position: 'relative' },
  progressBarFill:    { height: '100%', borderRadius: 6 },
  progressFooter:     { fontSize: 12, fontWeight: '700' },

  scoreTargetLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(0,0,0,0.18)' },
  scoreBarLabels:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  scoreBarEdge:    { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  scoreBarMid:     { fontSize: 10, fontWeight: '900' },
  scoreLabelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  scoreLabelText:  { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  scoreBreakdown:      { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 14, marginBottom: 6, marginTop: 4 },
  scoreBreakdownTitle: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },

  scoreFormula:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 },
  formulaBox:      { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 46 },
  formulaNumber:   { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  formulaLabel:    { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  formulaOp:       { fontSize: 18, fontWeight: '900', color: '#94A3B8' },
  formulaResultBox:{ alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 46 },
  formulaResult:   { fontSize: 20, fontWeight: '900' },

  miniStatRow:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  miniStat:      { flex: 1, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 10, gap: 4 },
  miniStatDot:   { width: 8, height: 8, borderRadius: 4 },
  miniStatValue: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  miniStatLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },

  hintBox:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' },
  hintText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 18 },

  howCard:       { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24, overflow: 'hidden' },
  howRow:        { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  howRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  howStepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  howStepText:   { fontSize: 13, fontWeight: '900', color: '#2563EB' },
  howItemText:   { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500' },

  benefitsList:    { gap: 12, paddingBottom: 48 },
  benefitCard:     { padding: 16, borderRadius: 20, borderWidth: 2 },
  benefitUnlocked: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  benefitLocked:   { backgroundColor: '#FFF', borderColor: '#F1F5F9', opacity: 0.75 },
  iconBox:         { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconBoxUnlocked: { backgroundColor: 'transparent' },
  iconBoxLocked:   { backgroundColor: '#F1F5F9' },
  iconGradient:    { width: '100%', height: '100%', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  benefitTextCont: { flex: 1 },
  benefitTitle:    { fontSize: 15, fontWeight: 'bold' },
  benefitDesc:     { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },
  activeBadge:     { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
