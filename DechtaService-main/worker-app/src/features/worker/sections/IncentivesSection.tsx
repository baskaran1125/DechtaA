import { useState, useEffect } from 'react';
import { Target, Trophy, Flame, Zap, Gift, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { getActiveIncentives, getIncentiveProgress, getDailyTarget, getSurgePricing } from '../workerSupabase';

interface Incentive {
  id: number;
  title: string;
  description: string;
  type: string;
  targetType: string;
  targetValue: string;
  rewardAmount: string;
  startDate: string;
  endDate: string;
}

interface IncentiveProgress {
  progress: {
    currentProgress: string;
    isCompleted: boolean;
  };
  incentive: Incentive;
}

interface DailyTarget {
  jobsTarget: number;
  jobsCompleted: number;
  earningsTarget: string;
  earningsAchieved: string;
  hoursTarget: string;
  hoursWorked: string;
  bonusEarned: string;
  streakCount: number;
}

interface SurgePricing {
  area: string;
  multiplier: string;
  reason: string;
}

export default function IncentivesSection() {
  const { state, showToast, t } = useWorker();
  const [loading, setLoading] = useState(true);
  const [dailyTarget, setDailyTarget] = useState<DailyTarget | null>(null);
  const [incentives, setIncentives] = useState<IncentiveProgress[]>([]);
  const [activeIncentives, setActiveIncentives] = useState<Incentive[]>([]);
  const [surgePricing, setSurgePricing] = useState<SurgePricing | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [targetRes, progressRes, incentivesRes] = await Promise.all([
        getDailyTarget(),
        getIncentiveProgress(),
        getActiveIncentives(),
      ]);
      setDailyTarget(targetRes?.data ?? targetRes);
      setIncentives(Array.isArray(progressRes?.data) ? progressRes.data : Array.isArray(progressRes) ? progressRes : []);
      setActiveIncentives(Array.isArray(incentivesRes?.data) ? incentivesRes.data : Array.isArray(incentivesRes) ? incentivesRes : []);

      // Check surge pricing for user's area
      if (state.user.location.city && state.user.location.area) {
        try {
          const surge = await getSurgePricing(state.user.location.city, state.user.location.area);
          setSurgePricing(surge);
        } catch (e) {
          // No surge pricing active
        }
      }
    } catch (err) {
      console.error('Failed to load incentive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Clock size={20} />;
      case 'weekly': return <Target size={20} />;
      case 'bonus': return <Gift size={20} />;
      case 'surge': return <Zap size={20} />;
      default: return <Trophy size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return '#3b82f6';
      case 'weekly': return '#8b5cf6';
      case 'bonus': return '#f59e0b';
      case 'surge': return '#ef4444';
      default: return '#22c55e';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('loading_notifications')}
      </div>
    );
  }

  return (
    <div>
      {/* Surge Pricing Alert */}
      {surgePricing && parseFloat(surgePricing.multiplier) > 1 && (
        <div className="w-glass w-card" style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))',
          border: '1px solid rgba(239, 68, 68, 0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={28} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: 18 }}>
                {surgePricing.multiplier}{t('surge_active')}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {t('surge_high_demand')} {surgePricing.area} {t('surge_earn_more')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Target Card */}
      {dailyTarget && (
        <div className="w-glass w-card" style={{ marginBottom: 24 }}>
          <div className="w-card-header">
            <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={20} className="icon" />
              {t('todays_target')}
            </div>
            {dailyTarget.streakCount > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                padding: '6px 12px',
                borderRadius: 20,
              }}>
                <Flame size={16} style={{ color: 'white' }} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                  {dailyTarget.streakCount} {t('day_streak')}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
            {/* Jobs Target */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 16,
              padding: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                margin: '0 auto 12px',
                position: 'relative',
                background: `conic-gradient(#3b82f6 ${getProgressPercent(dailyTarget.jobsCompleted, dailyTarget.jobsTarget)}%, transparent 0%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#3b82f6',
                }}>
                  {dailyTarget.jobsCompleted}/{dailyTarget.jobsTarget}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('jobs_label')}</p>
            </div>

            {/* Earnings Target */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 16,
              padding: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                margin: '0 auto 12px',
                position: 'relative',
                background: `conic-gradient(#22c55e ${getProgressPercent(parseFloat(dailyTarget.earningsAchieved), parseFloat(dailyTarget.earningsTarget))}%, transparent 0%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#22c55e',
                  fontSize: 12,
                }}>
                  ₹{Math.round(parseFloat(dailyTarget.earningsAchieved))}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('earnings_label')}</p>
            </div>

            {/* Hours Target */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 16,
              padding: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                margin: '0 auto 12px',
                position: 'relative',
                background: `conic-gradient(#8b5cf6 ${getProgressPercent(parseFloat(dailyTarget.hoursWorked), parseFloat(dailyTarget.hoursTarget))}%, transparent 0%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#8b5cf6',
                  fontSize: 12,
                }}>
                  {parseFloat(dailyTarget.hoursWorked).toFixed(1)}h
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('hours_label')}</p>
            </div>
          </div>

          {/* Bonus Earned */}
          {parseFloat(dailyTarget.bonusEarned) > 0 && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <Gift size={20} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
                ₹{dailyTarget.bonusEarned} {t('bonus_earned_today')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Active Incentives */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={20} className="icon" />
            {t('active_incentives')}
          </div>
        </div>

        {activeIncentives.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Trophy size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>{t('no_incentives')}</p>
            <p style={{ fontSize: 13 }}>{t('incentives_check_later')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            {activeIncentives.map((incentive) => {
              const progress = incentives.find(p => p.incentive.id === incentive.id);
              const currentVal = progress ? parseFloat(progress.progress.currentProgress) : 0;
              const targetVal = parseFloat(incentive.targetValue);
              const percent = getProgressPercent(currentVal, targetVal);
              const isCompleted = progress?.progress.isCompleted;

              return (
                <div
                  key={incentive.id}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${isCompleted ? '#22c55e' : 'var(--card-border)'}`,
                    background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${getTypeColor(incentive.type)}20`,
                      color: getTypeColor(incentive.type),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isCompleted ? <CheckCircle size={20} /> : getTypeIcon(incentive.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{incentive.title}</h4>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#22c55e',
                        }}>
                          +₹{incentive.rewardAmount}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {incentive.description}
                      </p>

                      {/* Progress Bar */}
                      <div style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: isCompleted ? '#22c55e' : getTypeColor(incentive.type),
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}>
                        <span>{currentVal} / {targetVal} {incentive.targetType}</span>
                        <span>{percent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
