import { useState, useEffect } from 'react';
import { Crown, Zap, Wallet, Star, User, Plus, ArrowUpRight, ChevronLeft, ChevronRight, Instagram, Gift, Megaphone, Trophy, IndianRupee, Clock, ShoppingBag } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { LEVEL_THRESHOLDS } from '../workerConstants';

// Advertisement data
const ADS = [
  {
    id: 1,
    title: 'Join Our Instagram Family',
    subtitle: 'Follow us for updates, tips & exclusive offers!',
    buttonText: 'Follow Now',
    gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
    icon: Instagram,
  },
  {
    id: 2,
    title: 'Refer & Earn ₹500',
    subtitle: 'Invite friends and earn rewards for each referral!',
    buttonText: 'Refer Now',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    icon: Gift,
  },
  {
    id: 3,
    title: 'New Offers Available!',
    subtitle: 'Check out the latest deals and boost your earnings.',
    buttonText: 'View Offers',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    icon: Megaphone,
  },
  {
    id: 4,
    title: 'Weekly Leaderboard',
    subtitle: 'Complete more jobs to climb the ranks and win prizes!',
    buttonText: 'View Rankings',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    icon: Trophy,
  },
];

export default function OverviewSection() {
  const { state, setState, showToast, t } = useWorker();
  const [loginTime, setLoginTime] = useState('0h 0m');
  const [currentAd, setCurrentAd] = useState(0);

  // Update online time every minute (only when online)
  useEffect(() => {
    const updateOnlineTime = () => {
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = state.lastOnlineDate !== today;

      // Reset if it's a new day
      if (isNewDay && state.lastOnlineDate) {
        setState(p => ({
          ...p,
          todayOnlineSeconds: 0,
          lastOnlineDate: today
        }));
        setLoginTime('0h 0m');
        return;
      }

      // Calculate total online time for today
      let totalSeconds = state.todayOnlineSeconds;

      // Add current session time if online
      if (state.isActive && state.onlineStartTime) {
        const currentSessionSeconds = Math.floor((Date.now() - state.onlineStartTime) / 1000);
        totalSeconds += currentSessionSeconds;
      }

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      setLoginTime(`${hours}h ${minutes}m`);
    };

    updateOnlineTime(); // Initial update
    const interval = setInterval(updateOnlineTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [state.isActive, state.onlineStartTime, state.todayOnlineSeconds, state.lastOnlineDate, setState]);

  // Auto-advance advertisement carousel every 5 seconds
  useEffect(() => {
    const adInterval = setInterval(() => {
      setCurrentAd(prev => (prev + 1) % ADS.length);
    }, 5000);
    return () => clearInterval(adInterval);
  }, []);

  const nextAd = () => setCurrentAd(prev => (prev + 1) % ADS.length);
  const prevAd = () => setCurrentAd(prev => (prev - 1 + ADS.length) % ADS.length);

  const getLevel = () => {
    const jobs = state.jobsDone;
    if (jobs >= LEVEL_THRESHOLDS.Platinum) return 'Platinum';
    if (jobs >= LEVEL_THRESHOLDS.Gold) return 'Gold';
    if (jobs >= LEVEL_THRESHOLDS.Silver) return 'Silver';
    return 'Bronze';
  };

  const getNextLevelJobs = () => {
    const jobs = state.jobsDone;
    if (jobs >= LEVEL_THRESHOLDS.Platinum) return LEVEL_THRESHOLDS.Max;
    if (jobs >= LEVEL_THRESHOLDS.Gold) return LEVEL_THRESHOLDS.Platinum;
    if (jobs >= LEVEL_THRESHOLDS.Silver) return LEVEL_THRESHOLDS.Gold;
    return LEVEL_THRESHOLDS.Silver;
  };

  const renderStars = () => {
    const rating = Math.min(state.rating, 5);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) stars.push(<Star key={i} size={16} fill="currentColor" />);
      else if (i === Math.ceil(rating) && rating % 1 !== 0) stars.push(<Star key={i} size={16} fill="currentColor" />);
      else stars.push(<Star key={i} size={16} style={{ opacity: 0.3 }} />);
    }
    return stars;
  };

  const level = getLevel();

  // Calculate week end date (Sunday)
  const getWeekEndDate = () => {
    // Helper to get Monday of current week
    const getMondayOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };

    // If no week start date, calculate current week's Monday
    const today = new Date();
    let weekStart: Date;

    if (!state.weekStartDate) {
      weekStart = getMondayOfWeek(today);
    } else {
      weekStart = new Date(state.weekStartDate + 'T00:00:00');
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get Sunday
    weekEnd.setHours(23, 59, 59, 999); // End of Sunday

    const daysRemaining = Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining === 0) return 'Resets tonight';
    if (daysRemaining === 1) return 'Resets tomorrow';
    return `Resets in ${daysRemaining} days`;
  };

  return (
    <div>
      {/* Premium Goal Card */}
      {state.isPremium && (
        <div className="w-glass w-card" style={{ background: 'linear-gradient(135deg, rgba(12, 237, 237, 0.1), rgba(0, 0, 0, 0.4))', border: '1px solid var(--logo-accent)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <Crown size={32} style={{ color: 'var(--logo-accent)' }} />
            <div>
              <h4 style={{ color: 'var(--logo-accent)' }}>Premium Partner Active</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>You have 10s priority access to all new jobs!</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-dashboard-grid">
        {/* Today's Progress */}
        <div className="w-glass w-card">
          <div className="w-card-header">
            <div className="w-card-title">{t('todays_progress') || "Today's Progress"}</div>
          </div>

          {/* Desktop Layout - Simple stat boxes */}
          <div className="w-stats-row w-progress-desktop">
            <div className="w-stat-box">
              <div className="w-stat-label">Earnings</div>
              <div className="w-stat-val" style={{ color: 'var(--success)' }}>₹{state.wallet.net}</div>
            </div>
            <div className="w-stat-box">
              <div className="w-stat-label">Online Time</div>
              <div className="w-stat-val" style={{ color: 'var(--text-main)' }}>{loginTime}</div>
            </div>
            <div className="w-stat-box">
              <div className="w-stat-label">Orders</div>
              <div className="w-stat-val" style={{ color: 'var(--warning)' }}>{state.jobsDone}</div>
            </div>
          </div>

          {/* Mobile Layout - Circular icons */}
          <div className="w-progress-mobile" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            {/* Earnings */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IndianRupee size={22} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>₹{state.wallet.net}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Earnings</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.1)' }} />

            {/* Online Time */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={22} style={{ color: '#3b82f6' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{loginTime}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Online Time</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.1)' }} />

            {/* Orders */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.05) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={22} style={{ color: '#f97316' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{state.jobsDone}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Orders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Advertisement Carousel */}
        <div className="w-glass w-card" style={{ minHeight: 200, padding: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Ad Content */}
          <div
            style={{
              background: ADS[currentAd].gradient,
              padding: 24,
              height: '100%',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Navigation Arrows */}
            <button
              onClick={prevAd}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextAd}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Icon */}
            {(() => {
              const IconComponent = ADS[currentAd].icon;
              return <IconComponent size={40} style={{ color: 'white', marginBottom: 12 }} />;
            })()}

            {/* Title */}
            <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>
              {ADS[currentAd].title}
            </h3>

            {/* Subtitle */}
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, margin: '0 0 16px 0', maxWidth: 250 }}>
              {ADS[currentAd].subtitle}
            </p>

            {/* CTA Button */}
            <button
              onClick={() => showToast('Coming soon!', 'success')}
              style={{
                background: 'white',
                color: '#333',
                border: 'none',
                borderRadius: 20,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {ADS[currentAd].buttonText}
            </button>

            {/* Pagination Dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
              {ADS.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentAd(idx)}
                  style={{
                    width: idx === currentAd ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: idx === currentAd ? 'white' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Counter */}
            <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              {currentAd + 1}/{ADS.length}
            </div>
          </div>
        </div>

        {/* Premium Goal */}
        <div className="w-glass w-card">
          <div className="w-card-header">
            <div className="w-card-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown size={20} style={{ color: state.isPremium ? 'var(--logo-accent)' : 'var(--text-muted)' }} />
              Premium Goal
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {getWeekEndDate()}
            </div>
          </div>

          {/* Three stat boxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Hours Progress */}
            <div style={{
              background: state.theme === 'light' ? 'rgba(12, 237, 237, 0.12)' : 'rgba(12, 237, 237, 0.05)',
              border: `1px solid rgba(12, 237, 237, ${state.theme === 'light' ? '0.6' : '0.3'})`,
              padding: 12,
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Weekly Hours</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--logo-accent)' }}>
                  {state.weeklyHours.toFixed(1)} / {state.premiumRules.requiredHours} hrs
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: 6,
                background: state.theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min((state.weeklyHours / state.premiumRules.requiredHours) * 100, 100)}%`,
                  height: '100%',
                  background: state.weeklyHours >= state.premiumRules.requiredHours
                    ? 'var(--logo-accent)'
                    : 'linear-gradient(90deg, #3b82f6, var(--logo-accent))',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Jobs Completed */}
            <div style={{
              background: state.theme === 'light' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.05)',
              border: `1px solid rgba(249, 115, 22, ${state.theme === 'light' ? '0.5' : '0.3'})`,
              padding: 12,
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Jobs Completed</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>{state.jobsDone}</div>
            </div>

            {/* Completion Rate */}
            <div style={{
              background: state.isPremium
                ? (state.theme === 'light' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.05)')
                : (state.theme === 'light' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.05)'),
              border: `1px solid ${state.isPremium 
                ? (state.theme === 'light' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)') 
                : (state.theme === 'light' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)')}`,
              padding: 12,
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completion Rate</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: state.isPremium ? '#22c55e' : '#3b82f6' }}>
                  {state.jobsDone}/{state.totalJobsReceived} ({state.totalJobsReceived > 0 ? Math.round((state.jobsDone / state.totalJobsReceived) * 100) : 0}%)
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: 6,
                background: state.theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${state.totalJobsReceived > 0 ? Math.min((state.jobsDone / state.totalJobsReceived) * 100, 100) : 0}%`,
                  height: '100%',
                  background: state.isPremium
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Worker Profile Card */}
        <div className="w-glass w-card w-level-card" style={{ height: '100%', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="w-card-header">
            <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} className="icon" style={{ color: 'var(--pie-color-1)', background: 'rgba(59, 130, 246, 0.1)',   padding: 4, borderRadius: '50%' }} /> {t('worker_profile_title')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
            {/* Rating */}
            <div style={{ background: 'rgba(12, 237, 237, 0.05)', border: '1px solid rgba(12, 237, 237, 0.3)', padding: 15, borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('client_rating_title')}</p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8, marginTop: 5 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--logo-accent)' }}>
                  {state.reviews > 0 ? state.rating.toFixed(1) : '0.0'}
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>({state.reviews} Reviews)</p>
              </div>
              <div className="w-rating-stars" style={{ display: 'flex', gap: 4 }}>{renderStars()}</div>
            </div>

            {/* Level */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: 15, borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('worker_level_title')}</p>
              <div className={`w-level-badge level-${level.toLowerCase()}`} style={{ marginTop: 10 }}>{level}</div>
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('jobs_completed_label')}</p>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>{state.jobsDone}</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {state.jobsDone >= LEVEL_THRESHOLDS.Max
                    ? 'Highest Level Achieved!'
                    : t('next_level_tip').replace('{nextJobCount}', String(getNextLevelJobs()))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
