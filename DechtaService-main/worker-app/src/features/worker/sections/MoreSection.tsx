import { useWorker } from '../WorkerContext';
import {
  User,
  HelpCircle,
  Settings,
  ChevronRight,
  Target,
  Users,
  Wallet,
  Bell,
  FileText,
  CreditCard,
  Globe,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { key: 'profile', icon: <User size={24} />, labelKey: 'nav_profile' },
  { key: 'wallet', icon: <CreditCard size={24} />, labelKey: 'nav_wallet' },
  { key: 'language', icon: <Globe size={24} />, labelKey: 'language' },
  { key: 'notifications', icon: <Bell size={24} />, labelKey: 'notifications' },
];

const MENU_ITEMS = [
  { key: 'incentives', icon: <Target size={20} />, labelKey: 'nav_incentives', badge: null },
  { key: 'referral', icon: <Users size={20} />, labelKey: 'refer_earn', badge: null },
  { key: 'help', icon: <HelpCircle size={20} />, labelKey: 'help_support', badge: null },
  { key: 'documents', icon: <FileText size={20} />, labelKey: 'my_documents', badge: null },
  { key: 'settings', icon: <Settings size={20} />, labelKey: 'nav_settings', badge: null },
];

export default function MoreSection() {
  const { state, setState, switchSection, t, showToast } = useWorker();

  const LANGUAGES: Array<'en' | 'hi' | 'ta'> = ['en', 'hi', 'ta'];
  const LANG_NAMES: Record<string, string> = { en: 'English', hi: 'हिंदी', ta: 'தமிழ்' };

  const handleItemClick = (key: string) => {
    // Handle language cycling
    if (key === 'language') {
      const currentIndex = LANGUAGES.indexOf(state.language);
      const nextIndex = (currentIndex + 1) % LANGUAGES.length;
      const nextLang = LANGUAGES[nextIndex];
      setState(p => ({ ...p, language: nextLang }));
      showToast(`Language: ${LANG_NAMES[nextLang]}`, 'success');
      return;
    }

    // Map keys to actual sections
    const sectionMap: Record<string, string> = {
      'profile': 'profile',
      'wallet': 'wallet',
      'notifications': 'notifications',
      'incentives': 'incentives',
      'help': 'help',
      'settings': 'settings',
      'documents': 'documents',
      'referral': 'profile', // redirect to profile for now
    };

    const targetSection = sectionMap[key] || 'overview';
    switchSection(targetSection);
  };

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      {/* Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--logo-accent) 0%, #f8d7a0 100%)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          color: '#000',
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {state.user.name}
        </h2>
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          ID: {state.user.referralCode || 'WRK-' + (state.user.phone?.slice(-6) || '000000')}
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {QUICK_ACTIONS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleItemClick(item.key)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 12,
              height: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              color: 'var(--text-main)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
            <span style={{
              fontSize: 11,
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{t(item.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Menu List */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.key}
            onClick={() => handleItemClick(item.key)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: index < MENU_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 15 }}>{t(item.labelKey)}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: item.badge === 'NEW' ? '#22c55e' : '#dcfce7',
                  color: item.badge === 'NEW' ? '#fff' : '#16a34a',
                }}
              >
                {item.badge}
              </span>
            )}
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        ))}
      </div>

      {/* App Version */}
      <p
        style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        App Version 1.0.0
      </p>
    </div>
  );
}
