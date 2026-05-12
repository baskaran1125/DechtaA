import { Palette, Moon, Sun, Globe, Bell, Lock, LogOut, RefreshCw } from 'lucide-react';
import { useWorker } from '../WorkerContext';

export default function SettingsSection() {
  const { state, setState, showToast, t } = useWorker();

  const handleThemeToggle = () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    setState(p => ({ ...p, theme: newTheme }));
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} Theme Selected`, 'success');
  };

  const handleLanguageChange = (lang: 'en' | 'hi' | 'ta') => {
    if (state.language !== lang) {
      setState(p => ({ ...p, language: lang }));
      showToast(`Language set to ${lang.toUpperCase()}`, 'success');
    }
  };

  const handleLogout = () => {
    setState(p => ({
      ...p,
      isLoggedIn: false,
      isActive: false,
      user: { ...p.user, name: 'Worker' },
      loginStartTime: 0
    }));
    showToast('Logged out successfully.', 'success');
  };

  return (
    <div>
      {/* Theme & Appearance */}
      <div className="w-setting-group">
        <h4>
          <Palette size={16} aria-hidden="true" style={{ marginRight: 6 }} />
          {t('theme_appearance')}
        </h4>
        <div className="w-setting-item">
          <span>{t('app_theme')}</span>
          <button className={`w-theme-toggle ${state.theme === 'light' ? 'light-active' : ''}`}
            onClick={handleThemeToggle}>
            <div className="w-theme-flip-inner">
              <div className="w-theme-flip-front">
                <Moon size={16} aria-hidden="true" />
              </div>
              <div className="w-theme-flip-back">
                <Sun size={16} aria-hidden="true" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="w-setting-group">
        <h4>
          <Globe size={16} aria-hidden="true" style={{ marginRight: 6 }} />
          {t('display_language')}
        </h4>
        <div className="w-setting-item">
          <span>{t('display_language')}</span>
          <div className="w-lang-toggle-group">
            {(['en', 'hi', 'ta'] as const).map(lang => (
              <button key={lang} className={`w-lang-toggle-btn ${state.language === lang ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang)}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="w-setting-group">
        <h4>
          <Bell size={16} aria-hidden="true" style={{ marginRight: 6 }} />
          {t('notification_settings')}
        </h4>
        <div className="w-setting-item">
          <span>{t('voice_assist')}</span>
          <div className={`w-toggle-switch ${state.isVoiceEnabled ? 'active' : ''}`}
            onClick={() => {
              setState(p => ({ ...p, isVoiceEnabled: !p.isVoiceEnabled }));
              showToast(!state.isVoiceEnabled ? t('voice_on') : t('voice_off'));
            }} />
        </div>
        <div className="w-setting-item">
          <span>{t('job_alerts')}</span>
          <div className="w-toggle-switch active" />
        </div>
      </div>

      {/* Account */}
      <div className="w-setting-group">
        <h4>
          <Lock size={16} aria-hidden="true" style={{ marginRight: 6 }} />
          {t('account')}
        </h4>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="w-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--danger)', color: '#fff' }}
            onClick={handleLogout}>
            <LogOut size={14} aria-hidden="true" style={{ marginRight: 6 }} />
            {t('logout')}
          </button>
          <button className="w-btn w-btn-outline" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              setState(p => ({
                ...p,
                wallet: { gross: 0, fees: 0, net: 0 },
                jobsDone: 0, rating: 0, reviews: 0,
                transactions: [], withdrawals: [],
                hasActiveJob: false, jobArrived: false, activeJobStartTime: 0,
                isFrozen: false
              }));
              showToast(t('session_reset'), 'warning');
            }}>
            <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6 }} />
            {t('reset_app_data')}
          </button>
        </div>
      </div>
    </div>
  );
}
