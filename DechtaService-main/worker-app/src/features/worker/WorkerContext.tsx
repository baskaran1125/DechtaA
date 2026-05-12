import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { WorkerState, PendingJobSession } from './workerTypes';
import { TRANSLATIONS } from './workerConstants';
import { recordJobCompletion, updateLocation } from './workerSupabase';

const generateReferralCode = () => 'PRO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
const generateJobId = () => 'JOB-' + Math.floor(10000 + Math.random() * 90000);

const initialState: WorkerState = {
  isLoggedIn: false, isActive: false, language: 'en',
  isVoiceEnabled: true, otpMode: 'START',
  isPremium: false, weeklyHours: 0, weeklyEarnings: 0, weekStartDate: null,
  premiumRules: { requiredHours: 38, priorityWindow: 10000 },
  user: {
    id: '',
    name: '', phone: '',
    photoFile: null, qualification: '',
    location: { state: '', city: '', area: '', address: '' },
    isProfileComplete: false, isApproved: false, isDocumentsSubmitted: false,
    selectedSkills: [],
    selectedCategory: '',
    idProofFile: null, idProofType: '',
    aadharNumber: '', aadharFile: null,
    panNumber: '', panFile: null,
    referralCode: generateReferralCode(),
    signupReferralCode: null,
    bankDetails: { name: '', branch: '', account: '', ifsc: '', passbookFile: null, status: 'pending' },
    hasBankDetails: false
  },
  wallet: { gross: 0, fees: 0, net: 0 },
  jobsDone: 0, totalJobsReceived: 0, rating: 0, reviews: 0,
  transactions: [],
  withdrawals: [],
  hasActiveJob: false, jobArrived: false, activeJobStartTime: 0,
  isFrozen: false, theme: 'dark', isFlipped: false,
  declinedCount: 0, isSuspended: false, suspensionEndTime: 0,
  loginStartTime: 0, onlineStartTime: null, todayOnlineSeconds: 0, lastOnlineDate: null, activeSection: 'overview',
  incomingJob: null, currentJobDetails: null,
  pendingJobs: [], currentSessionElapsedTime: 0
};

interface WorkerContextValue {
  state: WorkerState;
  setState: React.Dispatch<React.SetStateAction<WorkerState>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  switchSection: (section: string) => void;
  t: (key: string) => string;
  generateJobId: () => string;
  calculateHourlyEarnings: (seconds: number) => number;
  savePendingJob: (elapsedSeconds: number) => void;
  resumePendingJob: () => void;
  completePendingJob: (elapsedSeconds: number, paymentMethod?: 'Cash' | 'QR Code') => void;
}

const WorkerContext = createContext<WorkerContextValue | null>(null);

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkerState>(initialState);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const lastLocationSyncRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);

  // Cleanup toast timer on provider unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 3000);
  }, []);

  const switchSection = useCallback((section: string) => {
    setState(prev => ({ ...prev, activeSection: section }));
  }, []);

  const t = useCallback((key: string) => {
    return TRANSLATIONS[state.language]?.[key] || key;
  }, [state.language]);

  const calculateHourlyEarnings = useCallback((seconds: number) => {
    // 150 Rs per hour (precise calculation to support small durations on tests)
    const hours = seconds / 3600;
    return Number((hours * 150).toFixed(2));
  }, []);

  // Load pending jobs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('worker_pending_jobs');
      if (stored) {
        const pendingJobs = JSON.parse(stored) as PendingJobSession[];
        setState(prev => ({ ...prev, pendingJobs }));
      }
    } catch (error) {
      console.error('Failed to load pending jobs from localStorage:', error);
    }
  }, []);

  // Persist pending jobs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('worker_pending_jobs', JSON.stringify(state.pendingJobs));
    } catch (error) {
      console.error('Failed to save pending jobs to localStorage:', error);
    }
  }, [state.pendingJobs]);

  // Save current job as pending (pause and go home)
  const savePendingJob = useCallback((elapsedSeconds: number) => {
    setState(prev => {
      if (!prev.currentJobDetails) return prev;

      const newPendingJob: PendingJobSession = {
        jobDetails: prev.currentJobDetails,
        elapsedSeconds,
        pausedAt: new Date().toISOString(),
        acceptedAt: new Date(prev.activeJobStartTime).toISOString(),
        jobStatus: 'pending'
      };

      return {
        ...prev,
        pendingJobs: [newPendingJob], // Replace any existing pending job
        hasActiveJob: false,
        jobArrived: false,
        activeJobStartTime: 0,
        currentJobDetails: null,
        currentSessionElapsedTime: 0
      };
    });
  }, []);

  // Resume a pending job
  const resumePendingJob = useCallback(() => {
    setState(prev => {
      if (prev.pendingJobs.length === 0) return prev;

      const pendingJob = prev.pendingJobs[0];
      const resumedStartTime = Date.now() - (pendingJob.elapsedSeconds * 1000);

      return {
        ...prev,
        hasActiveJob: true,
        jobArrived: true, // Skip arrival step
        activeJobStartTime: resumedStartTime,
        currentJobDetails: pendingJob.jobDetails,
        currentSessionElapsedTime: pendingJob.elapsedSeconds,
        pendingJobs: [] // Clear pending while working
      };
    });
  }, []);

  // Complete a pending/active job
  const completePendingJob = useCallback(async (elapsedSeconds: number, paymentMethod: 'Cash' | 'QR Code' = 'Cash') => {
    const activeJob = state.currentJobDetails;
    if (!activeJob) return;

    // Fixed hourly earnings calculation (150rs per hr) as requested
    const finalJobValue = calculateHourlyEarnings(elapsedSeconds);
    const fees = finalJobValue * 0.15; // 15% commission
    const net = finalJobValue - fees;

    try {
      if (state.isLoggedIn) {
        await recordJobCompletion({
          serviceType: activeJob.service,
          amount: finalJobValue,
          paymentMethod,
          elapsedSeconds
        });
      }
    } catch (err) {
      console.warn('Backend job completion failed:', err);
    }

    setState(prev => {
      if (!prev.currentJobDetails) return prev;

      const newWallet = { ...prev.wallet };
      if (paymentMethod === 'Cash') {
        // Worker collects cash from customer; gross earnings recorded, fees deducted from net
        newWallet.gross += finalJobValue;
        newWallet.fees += fees;
        newWallet.net += net; // net goes to their wallet (already got cash, fees owed)
      } else {
        newWallet.gross += finalJobValue;
        newWallet.fees += fees;
        newWallet.net += net;
      }

      return {
        ...prev,
        wallet: newWallet,
        jobsDone: prev.jobsDone + 1,
        weeklyEarnings: prev.weeklyEarnings + (paymentMethod === 'QR Code' ? net : -fees),
        weeklyHours: prev.weeklyHours + (elapsedSeconds / 3600),
        hasActiveJob: false,
        jobArrived: false,
        activeJobStartTime: 0,
        currentJobDetails: null,
        currentSessionElapsedTime: 0,
        pendingJobs: [],
        transactions: [
          ...prev.transactions,
          {
            jobId: prev.currentJobDetails.id,
            service: `${prev.currentJobDetails.service} (${paymentMethod})`,
            date: new Date().toISOString(),
            amount: paymentMethod === 'QR Code' ? net : -fees,
            transactionType: paymentMethod === 'QR Code' ? 'credit' : 'debit'
          }
        ]
      };
    });
  }, [calculateHourlyEarnings, state.currentJobDetails, state.isLoggedIn]);

  useEffect(() => {
    if (!state.isLoggedIn || (!state.isActive && !state.hasActiveJob)) {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    const shouldSyncLocation = (latitude: number, longitude: number) => {
      const lastSync = lastLocationSyncRef.current;
      if (!lastSync) return true;

      const elapsedMs = Date.now() - lastSync.at;
      if (elapsedMs >= 20000) return true;

      const latDiffMeters = Math.abs(latitude - lastSync.latitude) * 111320;
      const lngDiffMeters = Math.abs(longitude - lastSync.longitude) * 111320;
      return Math.sqrt((latDiffMeters ** 2) + (lngDiffMeters ** 2)) >= 15;
    };

    const syncLocation = async (position: GeolocationPosition) => {
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !shouldSyncLocation(latitude, longitude)) {
        return;
      }

      try {
        const rawJobId = state.currentJobDetails?.id;
        const numericJobId = typeof rawJobId === 'number' ? rawJobId : Number(rawJobId);

        await updateLocation({
          latitude,
          longitude,
          accuracy: Number(position.coords.accuracy || 0),
          speed: Number(position.coords.speed || 0),
          heading: Number(position.coords.heading || 0),
          isOnJob: state.hasActiveJob,
          jobId: Number.isFinite(numericJobId) ? numericJobId : undefined,
        });

        lastLocationSyncRef.current = {
          latitude,
          longitude,
          at: Date.now(),
        };
      } catch (error) {
        console.warn('Failed to sync worker location:', error);
      }
    };

    const onLocationError = (error: GeolocationPositionError) => {
      // Silently ignore permissions policy blocks (code 1 = PERMISSION_DENIED)
      if (error.code !== 1) {
        console.warn('Worker location tracking failed:', error);
      }
    };

    try {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          void syncLocation(position);
        },
        onLocationError,
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 20000,
        }
      );
    } catch {
      // watchPosition itself can throw synchronously if blocked by permissions policy
    }

    return () => {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [state.currentJobDetails?.id, state.hasActiveJob, state.isActive, state.isLoggedIn]);

  return (
    <WorkerContext.Provider value={{ state, setState, showToast, switchSection, t, generateJobId, calculateHourlyEarnings, savePendingJob, resumePendingJob, completePendingJob }}>
      {children}
      {/* Toast */}
      <div className={`worker-toast ${toastVisible ? 'show' : ''} ${toastType === 'error' ? 'error' : ''}`}>
        <span className="worker-toast-icon">{toastType === 'error' ? '⚠️' : toastType === 'warning' ? '⚠️' : '✅'}</span>
        <span>{toastMsg}</span>
      </div>
    </WorkerContext.Provider>
  );
}

export function useWorker() {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error('useWorker must be used within WorkerProvider');
  return ctx;
}
