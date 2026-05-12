import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, Unlock, Hourglass, HelpCircle, Navigation, CheckCircle, MapPin, IndianRupee, QrCode, User, Clock, Briefcase, X, Phone, MessageSquare } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { COMMISSION } from '../workerConstants';

export default function JobsSection() {
  const { state, setState, showToast, t, generateJobId, calculateHourlyEarnings, savePendingJob, resumePendingJob, completePendingJob } = useWorker();
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [dynamicEarnings, setDynamicEarnings] = useState('Est. ₹0');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<number | null>(null);

  // Swipe button state
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const swipeThreshold = 0.85; // 85% to trigger

  // Complete swipe button state
  const [completeSwipeProgress, setCompleteSwipeProgress] = useState(0);
  const [isCompleteDragging, setIsCompleteDragging] = useState(false);
  const completeSwipeRef = useRef<HTMLDivElement>(null);
  const completeStartXRef = useRef(0);

  // Work timer for active job
  useEffect(() => {
    if (state.hasActiveJob && state.jobArrived && state.activeJobStartTime > 0) {
      timerRef.current = window.setInterval(() => {
        const elapsedMs = Date.now() - state.activeJobStartTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const hrs = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
        const mins = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
        const secs = (elapsedSec % 60).toString().padStart(2, '0');
        setTimerDisplay(`${hrs}:${mins}:${secs}`);
        setDynamicEarnings(`Current Rate: ₹${calculateHourlyEarnings(elapsedSec)}`);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.hasActiveJob, state.jobArrived, state.activeJobStartTime, calculateHourlyEarnings]);

  const handleArrived = () => {
    setState(p => ({ ...p, otpMode: 'START' }));
    setOtpValues(['', '', '', '']);
    setOtpModalOpen(true);
  };

  // Swipe handlers for "Arrived at Site"
  const handleSwipeStart = useCallback((clientX: number) => {
    if (!swipeRef.current) return;
    setIsDragging(true);
    startXRef.current = clientX;
  }, []);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (!isDragging || !swipeRef.current) return;
    const containerWidth = swipeRef.current.offsetWidth - 56; // subtract thumb width
    const deltaX = clientX - startXRef.current;
    const progress = Math.max(0, Math.min(1, deltaX / containerWidth));
    setSwipeProgress(progress);
  }, [isDragging]);

  const handleSwipeEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (swipeProgress >= swipeThreshold) {
      // Trigger arrived action
      setSwipeProgress(1);
      setTimeout(() => {
        handleArrived();
        setSwipeProgress(0);
      }, 200);
    } else {
      // Reset
      setSwipeProgress(0);
    }
  }, [isDragging, swipeProgress]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleSwipeStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleSwipeMove(e.clientX);
  const onMouseUp = () => handleSwipeEnd();
  const onMouseLeave = () => { if (isDragging) handleSwipeEnd(); };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleSwipeStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleSwipeMove(e.touches[0].clientX);
  const onTouchEnd = () => handleSwipeEnd();

  // Complete swipe handlers
  const handleCompleteSwipeStart = useCallback((clientX: number) => {
    if (!completeSwipeRef.current) return;
    setIsCompleteDragging(true);
    completeStartXRef.current = clientX;
  }, []);

  const handleCompleteSwipeMove = useCallback((clientX: number) => {
    if (!isCompleteDragging || !completeSwipeRef.current) return;
    const containerWidth = completeSwipeRef.current.offsetWidth - 56;
    const deltaX = clientX - completeStartXRef.current;
    const progress = Math.max(0, Math.min(1, deltaX / containerWidth));
    setCompleteSwipeProgress(progress);
  }, [isCompleteDragging]);

  const handleCompleteSwipeEnd = useCallback(() => {
    if (!isCompleteDragging) return;
    setIsCompleteDragging(false);
    if (completeSwipeProgress >= swipeThreshold) {
      setCompleteSwipeProgress(1);
      setTimeout(() => {
        handleCompleteSwipe();
        setCompleteSwipeProgress(0);
      }, 200);
    } else {
      setCompleteSwipeProgress(0);
    }
  }, [isCompleteDragging, completeSwipeProgress]);

  // Complete mouse events
  const onCompleteMouseDown = (e: React.MouseEvent) => handleCompleteSwipeStart(e.clientX);
  const onCompleteMouseMove = (e: React.MouseEvent) => handleCompleteSwipeMove(e.clientX);
  const onCompleteMouseUp = () => handleCompleteSwipeEnd();
  const onCompleteMouseLeave = () => { if (isCompleteDragging) handleCompleteSwipeEnd(); };

  // Complete touch events
  const onCompleteTouchStart = (e: React.TouchEvent) => handleCompleteSwipeStart(e.touches[0].clientX);
  const onCompleteTouchMove = (e: React.TouchEvent) => handleCompleteSwipeMove(e.touches[0].clientX);
  const onCompleteTouchEnd = () => handleCompleteSwipeEnd();

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpConfirm = () => {
    const entered = otpValues.join('');
    if (entered === '1234') {
      setOtpModalOpen(false);
      if (state.otpMode === 'START') {
        setState(p => ({ ...p, jobArrived: true, activeJobStartTime: Date.now() }));
        showToast('OTP Verified! Work timer started.');
      } else {
        handleFinalCompletion();
      }
    } else {
      showToast('Invalid OTP! (Try 1234)', 'error');
      setOtpValues(['', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleCompleteSwipe = () => {
    setState(p => ({ ...p, otpMode: 'END' }));
    setOtpValues(['', '', '', '']);
    setOtpModalOpen(true);
  };

  const handleFinalCompletion = async () => {
    const elapsedSec = Math.floor((Date.now() - state.activeJobStartTime) / 1000);
    
    // Call the central context method so the backend sync works
    await completePendingJob(elapsedSec, paymentMethod as 'Cash' | 'QR Code');

    // Reset UI states
    setOtpValues(['', '', '', '']);
    setOtpModalOpen(false);
    setSwipeProgress(0);
    setIsDragging(false);
    setCompleteSwipeProgress(0);
    setIsCompleteDragging(false);
    setTimerDisplay('00:00:00');
    setDynamicEarnings('Est. ₹0');
    showToast(t('job_completed_success') || 'Job Completed Successfully!', 'success');
  };

  // Determine what to show
  if (!state.user.isProfileComplete) {
    return (
      <div className="w-glass w-card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}><Unlock size={48} style={{ color: 'var(--logo-accent)' }} /></div>
        <h3 style={{ marginBottom: 10 }}>{t('waiting_approval')}</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('profile_review_msg')}{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {state.user.location.area}, {state.user.location.city}
          </span>.
        </p>
      </div>
    );
  }

  if (state.user.isProfileComplete && !state.user.isApproved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="w-glass w-card" style={{ textAlign: 'center', padding: 40, borderColor: 'var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}><Hourglass size={48} style={{ color: 'var(--warning)' }} /></div>
          <h3 style={{ marginBottom: 10 }}>Verification Pending</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            We have received your documents! Our admin team is currently verifying your profile, please visit the head office within 48 hours.
          </p>
        </div>

        <div className="w-glass w-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>Head Office</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                CED, Anna University, Guindy, Chennai
              </div>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=CED+Anna+University+Guindy+Chennai"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <MapPin size={20} style={{ color: 'var(--logo-accent)' }} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!state.isActive && !state.hasActiveJob) {
    return (
      <div>
        <div className="w-glass w-card" style={{ textAlign: 'center', padding: 40, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}><HelpCircle size={48} style={{ color: 'var(--text-muted)' }} /></div>
          <h3 style={{ marginBottom: 10 }}>{t('go_online_prompt')}</h3>
          <p style={{ color: 'var(--text-muted)' }}>{t('offline_instruction')}</p>
        </div>

        {/* Past Jobs - Always visible */}
        <div className="w-glass w-card">
          <div className="w-card-header">
            <div className="w-card-title" style={{ fontSize: 16 }}>{t('past_jobs')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>{t('th_job_id')}</th>
                <th style={{ width: '35%' }}>{t('th_service')}</th>
                <th style={{ width: '25%' }}>{t('th_date')}</th>
                <th style={{ width: '15%' }} className="w-amount-col">{t('th_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {state.transactions.length > 0 ? (
                [...state.transactions].reverse().map((tx, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tx.jobId}</td>
                    <td>{tx.service}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="w-amount-col" style={{ color: tx.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {tx.amount < 0 ? '' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>{t('no_past_jobs')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Active Job */}
      {state.hasActiveJob && state.currentJobDetails && (
        <div className="w-job-card" style={{ borderColor: 'var(--warning)', marginBottom: 24 }}>
          <div className="w-card-header">
            <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlayCircle size={18} className="icon" style={{ color: 'var(--warning)', background: 'rgba(249, 115, 22, 0.1)' }} /> {t('job_active')}</div>
            <span className="w-tag" style={{ background: state.jobArrived ? 'var(--success)' : 'var(--warning)', color: 'var(--bg-darker)' }}>
              {state.jobArrived ? t('in_progress') : t('accepted')}
            </span>
          </div>

          {/* Job Details */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={20} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{state.currentJobDetails.service}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{state.currentJobDetails.skillType}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{state.currentJobDetails.customerName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{state.currentJobDetails.area}</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: 20 }}>
            <h2 style={{ color: 'var(--accent)', fontSize: 32, marginBottom: 10 }}>{timerDisplay}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{state.jobArrived ? t('time_on_site') : t('awaiting_arrival')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px 20px' }}>
            {!state.jobArrived ? (
              <>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="w-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#3b82f6', color: 'white' }}>
                  <Navigation size={16} /> {t('navigate_site')}
                </a>

                {/* Swipeable Arrived at Site Button */}
                <div
                  ref={swipeRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 56,
                    borderRadius: 28,
                    background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.25) 100%)',
                    border: '2px solid rgba(0, 240, 255, 0.4)',
                    overflow: 'hidden',
                    cursor: 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Progress fill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${swipeProgress * 100}%`,
                      background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.3) 0%, rgba(0, 240, 255, 0.5) 100%)',
                      transition: isDragging ? 'none' : 'width 0.3s ease',
                    }}
                  />

                  {/* Label */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'var(--logo-accent)',
                      fontWeight: 600,
                      fontSize: 14,
                      pointerEvents: 'none',
                    }}
                  >
                    {t('btn_arrived')}
                  </div>

                  {/* Draggable thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      transform: `translateX(${swipeProgress * ((swipeRef.current?.offsetWidth || 200) - 56)}px)`,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--logo-accent) 0%, #00c8d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      transition: isDragging ? 'none' : 'transform 0.3s ease',
                    }}
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                  >
                    <MapPin size={22} style={{ color: '#000' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <a
                    href={`sms:${state.currentJobDetails?.phone?.replace(/x/g, '0') || ''}`}
                    className="w-btn"
                    style={{ flex: 1, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: 12, color: '#3b82f6', fontWeight: 600 }}
                  >
                    <MessageSquare size={20} style={{ color: '#3b82f6' }} /> {t('btn_message')}
                  </a>
                  <a
                    href={`tel:${state.currentJobDetails?.phone?.replace(/x/g, '0') || ''}`}
                    className="w-btn"
                    style={{ flex: 1, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: 12, color: '#22c55e', fontWeight: 600 }}
                  >
                    <Phone size={20} style={{ color: '#22c55e' }} /> {t('btn_call_job')}
                  </a>
                </div>
                <button
                  className="w-btn w-btn-outline"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    color: '#ef4444',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    setState(p => ({
                      ...p,
                      hasActiveJob: false,
                      currentJobDetails: null,
                      jobArrived: false,
                      activeJobStartTime: 0
                    }));
                    showToast('Job cancelled', 'warning');
                  }}
                >
                  <X size={16} /> {t('btn_cancel_job')}
                </button>
              </>
            ) : (
              <>
                {/* Swipeable Complete Job Button */}
                <div
                  ref={completeSwipeRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 56,
                    borderRadius: 28,
                    background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.25) 100%)',
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    overflow: 'hidden',
                    cursor: 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  onMouseMove={onCompleteMouseMove}
                  onMouseUp={onCompleteMouseUp}
                  onMouseLeave={onCompleteMouseLeave}
                  onTouchMove={onCompleteTouchMove}
                  onTouchEnd={onCompleteTouchEnd}
                >
                  {/* Progress fill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${completeSwipeProgress * 100}%`,
                      background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.5) 100%)',
                      transition: isCompleteDragging ? 'none' : 'width 0.3s ease',
                    }}
                  />

                  {/* Label */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#22c55e',
                      fontWeight: 600,
                      fontSize: 14,
                      pointerEvents: 'none',
                    }}
                  >
                    {t('btn_complete')}
                  </div>

                  {/* Draggable thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      transform: `translateX(${completeSwipeProgress * ((completeSwipeRef.current?.offsetWidth || 200) - 56)}px)`,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                      cursor: isCompleteDragging ? 'grabbing' : 'grab',
                      transition: isCompleteDragging ? 'none' : 'transform 0.3s ease',
                    }}
                    onMouseDown={onCompleteMouseDown}
                    onTouchStart={onCompleteTouchStart}
                  >
                    <CheckCircle size={22} style={{ color: '#fff' }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save & Go Home Button - shown when job is in progress */}
          {state.jobArrived && (
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button
                onClick={() => {
                  const elapsedSec = Math.floor((Date.now() - state.activeJobStartTime) / 1000);
                  savePendingJob(elapsedSec);
                  showToast('Job saved! You can resume tomorrow.', 'success');
                }}
                className="w-btn"
                style={{
                  background: 'rgba(249, 115, 22, 0.2)',
                  border: '1px solid rgba(249, 115, 22, 0.5)',
                  color: '#f97316',
                  fontWeight: 600,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Hourglass size={16} /> Save & Go Home
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scanning for Jobs (only when online without active job) */}
      {state.isActive && !state.hasActiveJob && !state.incomingJob && (
        <div className="w-glass w-card" style={{ textAlign: 'center', padding: 40, borderColor: 'var(--logo-accent)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
            <div className="spinner" style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '4px solid rgba(0, 240, 255, 0.2)',
              borderTopColor: 'var(--logo-accent)',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
          <h3 style={{ marginBottom: 10, color: 'var(--logo-accent)' }}>{t('scanning_jobs') || 'Scanning for Jobs...'}</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {t('stay_online_msg') || 'Please stay online to receive nearby service requests.'}
          </p>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {/* Pending Job Card - Show when there's a pending job */}
      {state.pendingJobs.length > 0 && !state.hasActiveJob && (
        <div className="w-glass w-card" style={{ borderColor: 'var(--warning)', marginBottom: 24, background: 'rgba(249, 115, 22, 0.05)' }}>
          <div className="w-card-header">
            <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Hourglass size={18} style={{ color: 'var(--warning)' }} /> Pending Job
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                {state.pendingJobs[0].jobDetails.service}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {state.pendingJobs[0].jobDetails.customerName}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Time Worked</div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {Math.floor(state.pendingJobs[0].elapsedSeconds / 3600)}h {Math.floor((state.pendingJobs[0].elapsedSeconds % 3600) / 60)}m
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Paused</div>
                <div style={{ fontSize: 12, color: 'var(--text-main)' }}>
                  {new Date(state.pendingJobs[0].pausedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                resumePendingJob();
                showToast('Job resumed! Continue working.', 'success');
              }}
              className="w-btn w-btn-success"
              style={{ width: '100%' }}
            >
              <PlayCircle size={16} style={{ marginRight: 6 }} /> Resume Work
            </button>
          </div>
        </div>
      )}

      {/* Past Jobs */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title" style={{ fontSize: 16 }}>{t('past_jobs')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>{t('th_job_id')}</th>
              <th style={{ width: '35%' }}>{t('th_service')}</th>
              <th style={{ width: '25%' }}>{t('th_date')}</th>
              <th style={{ width: '15%' }} className="w-amount-col">{t('th_amount')}</th>
            </tr>
          </thead>
          <tbody>
            {state.transactions.length > 0 ? (
              [...state.transactions].reverse().map((tx, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tx.jobId}</td>
                  <td>{tx.service}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="w-amount-col" style={{ color: tx.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {tx.amount < 0 ? '' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>{t('no_past_jobs')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* OTP Modal */}
      {otpModalOpen && (
        <div className="w-modal-overlay" style={{ overflow: 'hidden' }} onClick={() => setOtpModalOpen(false)}>
          <div className="w-modal-content" style={{ maxWidth: 400, textAlign: 'center', overflowY: 'hidden', overflowX: 'hidden' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {state.otpMode === 'START' ? <><PlayCircle size={20} /> {t('verify_start')}</> : <><CheckCircle size={20} /> {t('complete_pay')}</>}
            </h3>

            {state.otpMode === 'END' && (
              <div style={{ marginBottom: 20 }}>
                {/* Payment Method Toggle - Pill Style */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 25,
                  padding: 4,
                  marginBottom: 20
                }}>
                  <button
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 20,
                      border: 'none',
                      background: paymentMethod === 'Cash' ? 'var(--logo-accent)' : 'transparent',
                      color: paymentMethod === 'Cash' ? '#000' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setPaymentMethod('Cash')}
                  >
                    <IndianRupee size={16} /> Cash
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 20,
                      border: 'none',
                      background: paymentMethod === 'QR Code' ? 'var(--logo-accent)' : 'transparent',
                      color: paymentMethod === 'QR Code' ? '#000' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setPaymentMethod('QR Code')}
                  >
                    <QrCode size={16} /> QR
                  </button>
                </div>

                {/* Cash Display */}
                {paymentMethod === 'Cash' && (
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>{t('collect_customer')}</p>
                    <div style={{
                      fontSize: 48,
                      fontWeight: 800,
                      color: '#22c55e'
                    }}>
                      ₹{calculateHourlyEarnings(state.activeJobStartTime > 0 ? Math.floor((Date.now() - state.activeJobStartTime) / 1000) : 0)}
                    </div>
                  </div>
                )}

                {/* QR Code Display */}
                {paymentMethod === 'QR Code' && (
                  <div style={{ textAlign: 'center' }}>
                    {/* QR Code Box */}
                    <div style={{
                      display: 'inline-block',
                      background: '#fff',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12
                    }}>
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <rect width="140" height="140" fill="white"/>
                        {/* QR Corner patterns - Top Left */}
                        <rect x="8" y="8" width="32" height="32" fill="#000"/>
                        <rect x="12" y="12" width="24" height="24" fill="white"/>
                        <rect x="16" y="16" width="16" height="16" fill="#000"/>

                        {/* QR Corner patterns - Top Right */}
                        <rect x="100" y="8" width="32" height="32" fill="#000"/>
                        <rect x="104" y="12" width="24" height="24" fill="white"/>
                        <rect x="108" y="16" width="16" height="16" fill="#000"/>

                        {/* QR Corner patterns - Bottom Left */}
                        <rect x="8" y="100" width="32" height="32" fill="#000"/>
                        <rect x="12" y="104" width="24" height="24" fill="white"/>
                        <rect x="16" y="108" width="16" height="16" fill="#000"/>

                        {/* Data modules */}
                        <rect x="48" y="8" width="6" height="6" fill="#000"/>
                        <rect x="60" y="8" width="6" height="6" fill="#000"/>
                        <rect x="72" y="8" width="6" height="6" fill="#000"/>
                        <rect x="84" y="8" width="6" height="6" fill="#000"/>
                        <rect x="48" y="20" width="6" height="6" fill="#000"/>
                        <rect x="66" y="14" width="6" height="6" fill="#000"/>
                        <rect x="78" y="20" width="6" height="6" fill="#000"/>
                        <rect x="90" y="26" width="6" height="6" fill="#000"/>

                        <rect x="8" y="48" width="6" height="6" fill="#000"/>
                        <rect x="20" y="52" width="6" height="6" fill="#000"/>
                        <rect x="8" y="60" width="6" height="6" fill="#000"/>
                        <rect x="26" y="66" width="6" height="6" fill="#000"/>
                        <rect x="8" y="72" width="6" height="6" fill="#000"/>
                        <rect x="14" y="84" width="6" height="6" fill="#000"/>

                        {/* Center pattern */}
                        <rect x="55" y="55" width="30" height="30" fill="#000"/>
                        <rect x="60" y="60" width="20" height="20" fill="white"/>
                        <rect x="65" y="65" width="10" height="10" fill="#000"/>

                        <rect x="100" y="48" width="6" height="6" fill="#000"/>
                        <rect x="112" y="52" width="6" height="6" fill="#000"/>
                        <rect x="126" y="48" width="6" height="6" fill="#000"/>
                        <rect x="106" y="60" width="6" height="6" fill="#000"/>
                        <rect x="120" y="66" width="6" height="6" fill="#000"/>
                        <rect x="100" y="78" width="6" height="6" fill="#000"/>
                        <rect x="118" y="84" width="6" height="6" fill="#000"/>

                        <rect x="48" y="100" width="6" height="6" fill="#000"/>
                        <rect x="60" y="106" width="6" height="6" fill="#000"/>
                        <rect x="72" y="100" width="6" height="6" fill="#000"/>
                        <rect x="84" y="100" width="6" height="6" fill="#000"/>
                        <rect x="54" y="114" width="6" height="6" fill="#000"/>
                        <rect x="66" y="120" width="6" height="6" fill="#000"/>
                        <rect x="78" y="114" width="6" height="6" fill="#000"/>
                        <rect x="90" y="126" width="6" height="6" fill="#000"/>

                        <rect x="100" y="100" width="6" height="6" fill="#000"/>
                        <rect x="112" y="106" width="6" height="6" fill="#000"/>
                        <rect x="126" y="100" width="6" height="6" fill="#000"/>
                        <rect x="106" y="114" width="6" height="6" fill="#000"/>
                        <rect x="120" y="120" width="6" height="6" fill="#000"/>
                      </svg>
                    </div>

                    {/* Amount */}
                    <div style={{
                      fontSize: 42,
                      fontWeight: 800,
                      color: '#22c55e',
                      marginBottom: 4
                    }}>
                      ₹{calculateHourlyEarnings(state.activeJobStartTime > 0 ? Math.floor((Date.now() - state.activeJobStartTime) / 1000) : 0)}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
                      {t('scan_pay')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {state.otpMode === 'START' ? t('otp_start_msg') : t('otp_finish_msg')}
            </p>
            <div className="w-otp-input-group">
              {otpValues.map((val, idx) => (
                <input key={idx} ref={el => { otpRefs.current[idx] = el; }}
                  className="w-otp-digit" type="text" maxLength={1} inputMode="numeric"
                  value={val} onChange={e => handleOtpInput(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e.key)} />
              ))}
            </div>
            <button className="w-btn-primary" onClick={handleOtpConfirm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}><CheckCircle size={16} /> {t('confirm_otp')}</button>
            <button className="w-btn w-btn-outline" onClick={() => setOtpModalOpen(false)} style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>{t('cancel_btn')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
