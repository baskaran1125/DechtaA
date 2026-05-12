import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, User, Clock, Briefcase, X, CheckCircle, Volume2, Pause } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import type { IncomingJob } from '../workerTypes';

interface IncomingJobModalProps {
  job: IncomingJob;
  onAccept: () => void;
  onDecline: () => void;
  isPremium: boolean;
  rateRange?: { minRate: string; maxRate: string } | null;
}

export default function IncomingJobModal({ job, onAccept, onDecline, isPremium, rateRange }: IncomingJobModalProps) {
  const { t } = useWorker();
  const [jobCountdown, setJobCountdown] = useState(30);
  const [acceptCountdown, setAcceptCountdown] = useState(isPremium ? 0 : 10);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const swipeContainerRef = useRef<HTMLDivElement | null>(null);
  const jobTimerRef = useRef<number | null>(null);
  const acceptTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice note play/pause handler
  const handleVoiceNote = () => {
    if (!job.voiceNote) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(job.voiceNote);
      audioRef.current.onended = () => setIsPlayingVoice(false);
    }

    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlayingVoice(false);
      });
      setIsPlayingVoice(true);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Accept countdown timer for non-premium workers
  useEffect(() => {
    if (acceptCountdown > 0) {
      acceptTimerRef.current = window.setTimeout(() => {
        setAcceptCountdown(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (acceptTimerRef.current) clearTimeout(acceptTimerRef.current);
    };
  }, [acceptCountdown]);

  // Job countdown timer
  useEffect(() => {
    if (jobCountdown > 0) {
      jobTimerRef.current = window.setTimeout(() => {
        setJobCountdown(prev => prev - 1);
      }, 1000);
    } else if (jobCountdown === 0) {
      // Auto-decline when timer expires
      onDecline();
    }

    return () => {
      if (jobTimerRef.current) clearTimeout(jobTimerRef.current);
    };
  }, [jobCountdown, onDecline]);

  // Swipe handlers
  const handleSwipeStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (!swipeContainerRef.current) return;

    const containerRect = swipeContainerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const relativeX = clientX - containerRect.left;
    const centerX = containerWidth / 2;
    let offset = relativeX - centerX;

    // Limit swipe range
    const maxOffset = containerWidth / 2 - 40;
    offset = Math.max(-maxOffset, Math.min(maxOffset, offset));

    setSwipeOffset(offset);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeContainerRef.current) {
      setIsDragging(false);
      setSwipeOffset(0);
      return;
    }

    const containerWidth = swipeContainerRef.current.getBoundingClientRect().width;
    const threshold = containerWidth * 0.35;

    if (swipeOffset < -threshold) {
      // Swiped left - Decline
      onDecline();
    } else if (swipeOffset > threshold) {
      // Swiped right - Accept
      if (acceptCountdown === 0) {
        onAccept();
      }
    }

    // Reset
    setIsDragging(false);
    setSwipeOffset(0);
  }, [swipeOffset, acceptCountdown, onDecline, onAccept]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleSwipeStart();
  }, [handleSwipeStart]);

  const handleTouchStart = useCallback(() => {
    handleSwipeStart();
  }, [handleSwipeStart]);

  // Global mouse/touch event listeners for swipe
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleSwipeMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleSwipeEnd();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleSwipeMove, handleSwipeEnd]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
    }}>
      <div className="w-glass w-card" style={{
        borderColor: 'var(--success)',
        overflow: 'hidden',
        maxWidth: 420,
        width: '100%',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Header with countdown */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))',
          borderBottom: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1s infinite' }} />
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{t('new_job_req')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12 }}>
            <Clock size={14} style={{ color: jobCountdown <= 10 ? 'var(--danger)' : 'var(--warning)' }} />
            <span style={{ fontWeight: 700, color: jobCountdown <= 10 ? 'var(--danger)' : 'var(--warning)' }}>{jobCountdown}s</span>
          </div>
        </div>

        {/* Job Details */}
        <div style={{ padding: 16 }}>
          {/* Service & Customer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={24} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)', marginBottom: 4 }}>{job.service}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="w-tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: 11, padding: '2px 8px' }}>{job.skillType}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>
                {rateRange ? `₹${rateRange.minRate} - ₹${rateRange.maxRate}` : `₹${job.estimatedPay}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('est_pay_range')}</div>
            </div>
          </div>

          {/* Description with Voice Note */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>{job.description}</p>

            {/* Voice Note Button */}
            {job.voiceNote && (
              <div
                onClick={handleVoiceNote}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isPlayingVoice
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                    : 'rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  border: isPlayingVoice ? '2px solid #a855f7' : '1px solid rgba(139, 92, 246, 0.4)',
                }}
                title={isPlayingVoice ? 'Pause voice note' : 'Play voice note'}
              >
                {isPlayingVoice ? (
                  <Pause size={18} style={{ color: '#fff' }} />
                ) : (
                  <Volume2 size={18} style={{ color: '#a855f7' }} />
                )}
              </div>
            )}
          </div>

          {/* Customer & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{job.customerName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.phone}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} style={{ color: '#f97316' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{job.area}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.distance} {t('away')}</div>
              </div>
            </div>
          </div>

          {/* Swipe Action */}
          {acceptCountdown > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: 14,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('accept_in')}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)' }}>{acceptCountdown}s</div>
            </div>
          ) : (
            <div
              ref={swipeContainerRef}
              style={{
                position: 'relative',
                height: 70,
                borderRadius: 16,
                overflow: 'hidden',
                userSelect: 'none',
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={(e) => {
                if (isDragging) {
                  handleSwipeMove(e.touches[0].clientX);
                }
              }}
              onTouchEnd={handleSwipeEnd}
            >
              {/* Background layers */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                background: swipeOffset < -20
                  ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.2) 40%, rgba(34, 197, 94, 0.1) 60%, rgba(34, 197, 94, 0.1) 100%)'
                  : swipeOffset > 20
                  ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.1) 40%, rgba(34, 197, 94, 0.2) 60%, rgba(34, 197, 94, 0.4) 100%)'
                  : 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.15) 40%, rgba(34, 197, 94, 0.15) 60%, rgba(34, 197, 94, 0.15) 100%)',
                transition: isDragging ? 'none' : 'background 0.3s',
              }}>
                {/* Decline side (left) */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingLeft: 20,
                }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: swipeOffset < -20 ? '#ef4444' : '#fca5a5',
                    transition: isDragging ? 'none' : 'color 0.3s',
                  }}>
                    <X size={20} style={{ display: 'inline', marginRight: 6 }} />
                    {t('decline')}
                  </span>
                </div>

                {/* Accept side (right) */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 20,
                }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: swipeOffset > 20 ? '#22c55e' : '#86efac',
                    transition: isDragging ? 'none' : 'color 0.3s',
                  }}>
                    {t('accept')}
                    <CheckCircle size={20} style={{ display: 'inline', marginLeft: 6 }} />
                  </span>
                </div>
              </div>

              {/* Draggable handle */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${swipeOffset}px), -50%)`,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                transition: isDragging ? 'none' : 'transform 0.3s',
                zIndex: 10,
              }}>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
