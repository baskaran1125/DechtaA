import { useState, useCallback, useEffect } from 'react';
import { WorkerProvider, useWorker } from './WorkerContext';
import WorkerSplashScreen from './WorkerSplashScreen';
import WorkerAuthScreen from './WorkerAuthScreen';
import WorkerLayout from './WorkerLayout';
import { getWorkerProfile } from './workerSupabase';
import './WorkerDashboard.css';

const LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
};

function WorkerDashboardInner() {
  const { state, setState } = useWorker();
  const [splashDone, setSplashDone] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);
  const handleLogin = useCallback(() => {}, []); // state.isLoggedIn handles transition

  // Restore session from persisted token so existing workers directly land in dashboard.
  useEffect(() => {
    let cancelled = false;

    const bootstrapWorkerSession = async () => {
      const token = localStorage.getItem('dechta_worker_token');
      if (!token) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      try {
        const res = await getWorkerProfile();
        const worker = res?.worker || res?.data?.worker;
        const workerId = String(worker?.id ?? worker?.workerId ?? worker?.profileId ?? '').trim();
        const resolvedPhone = String(worker?.mobile ?? worker?.phone ?? '').trim();
        const resolvedName = String(worker?.fullName ?? worker?.name ?? '').trim();
        const resolvedSkillCategory = String(worker?.skillCategory ?? worker?.qualification ?? '').trim();
        const resolvedIsProfileComplete = Boolean(
          worker?.isProfileComplete ?? worker?.is_profile_complete ?? worker?.isRegistered ?? worker?.is_registered ?? false
        );
        const resolvedSelectedSkills = Array.isArray(worker?.skillCategories)
          ? worker.skillCategories.filter(Boolean)
          : [];

        if (!worker || cancelled) {
          if (!cancelled) {
            localStorage.removeItem('dechta_worker_token');
            setAuthChecked(true);
          }
          return;
        }

        setState((prev) => ({
          ...prev,
          isLoggedIn: true,
          loginStartTime: Date.now(),
          user: {
            ...prev.user,
            id: workerId,
            phone: resolvedPhone,
            name: resolvedName,
            qualification: resolvedSkillCategory,
            location: {
              state: String(worker?.state || ''),
              city: String(worker?.city || ''),
              area: String(worker?.area || ''),
              address: String(worker?.address || ''),
            },
            isProfileComplete: resolvedIsProfileComplete,
            isApproved: Boolean(worker?.isApproved ?? worker?.is_approved ?? false),
            isDocumentsSubmitted: Boolean(worker?.isDocumentsSubmitted ?? worker?.is_documents_submitted ?? false),
            selectedCategory: resolvedSkillCategory,
            selectedSkills: resolvedSelectedSkills,
            aadharNumber: String(worker?.aadharNumber || ''),
            panNumber: String(worker?.panNumber || ''),
          },
          isPremium: Boolean(worker?.isPremium || false),
          isFrozen: Boolean(worker?.isFrozen || false),
        }));
      } catch {
        if (!cancelled) {
          localStorage.removeItem('dechta_worker_token');
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    bootstrapWorkerSession();

    return () => {
      cancelled = true;
    };
  }, [setState]);

  // Select-to-Speak: read aloud clicked text when voice is enabled
  useEffect(() => {
    if (!state.isVoiceEnabled) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Skip if clicking on interactive elements (buttons, inputs, selects, toggles)
      const tag = target.tagName.toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag)) return;

      // Get the innermost text content
      const text = (target.innerText || target.textContent || '').trim();
      if (!text || text.length > 500) return; // skip empty or excessively long text

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_MAP[state.language] || 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      window.speechSynthesis.cancel();
    };
  }, [state.isVoiceEnabled, state.language]);

  if (!splashDone) {
    return <WorkerSplashScreen onComplete={handleSplashComplete} />;
  }

  if (!authChecked) {
    return null;
  }

  if (!state.isLoggedIn) {
    return (
      <div className={`worker-dashboard ${state.theme === 'light' ? 'light-theme' : ''}`}>
        <WorkerAuthScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`worker-dashboard ${state.theme === 'light' ? 'light-theme' : ''}`}>
      <WorkerLayout />
    </div>
  );
}

export default function WorkerDashboardPage() {
  return (
    <WorkerProvider>
      <WorkerDashboardInner />
    </WorkerProvider>
  );
}
