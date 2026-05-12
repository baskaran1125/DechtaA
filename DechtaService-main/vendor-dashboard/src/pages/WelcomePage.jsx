import { useState } from 'react';

export default function WelcomePage({ onRoleSelect }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [showLangModal, setShowLangModal] = useState(false);

  const roles = [
    {
      id: 'driver',
      emoji: '🚗',
      title: 'Driver',
      subtitle: 'Delivery & logistics partner',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-300',
      port: 19006,
      appName: 'driver-app',
    },
    {
      id: 'vendor',
      emoji: '🏪',
      title: 'Vendor',
      subtitle: 'Manage your shop, orders & products',
      color: 'from-cyan-500 to-cyan-600',
      borderColor: 'border-cyan-300',
      port: 5173,
      appName: 'vendor-dashboard',
    },
    {
      id: 'worker',
      emoji: '👷',
      title: 'Worker',
      subtitle: 'Manpower & on-site task management',
      color: 'from-orange-500 to-orange-600',
      borderColor: 'border-orange-300',
      port: 5176,
      appName: 'worker-app',
    },
  ];

  const handleRolePress = (role) => {
    // All roles now load in the SAME TAB (single page app)
    onRoleSelect(role.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Top Controls */}
      <div className="flex justify-between items-center px-6 py-4">
        <div></div>
        <button
          onClick={() => setShowLangModal(true)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
        >
          <span>🌐</span>
          <span className="uppercase text-xs font-bold">{selectedLang}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-bold">D</span>
          </div>
          <h1 className="text-4xl font-bold text-center">Dechta Logistics</h1>
          <p className="text-slate-400 text-center mt-2">Choose your role to continue</p>
        </div>

        {/* Role Cards */}
        <div className="w-full max-w-md space-y-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRolePress(role)}
              title={`Click to access ${role.title} (${role.appName})`}
              className={`w-full p-6 rounded-2xl border-2 ${role.borderColor} bg-gradient-to-r ${role.color} bg-opacity-10 hover:bg-opacity-20 transition-all transform hover:scale-105 shadow-lg text-left group active:scale-95`}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{role.emoji}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{role.title}</h3>
                  <p className="text-slate-300 text-sm">{role.subtitle}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {role.appName} • Port {role.port}
                  </p>
                </div>
                <span className="text-2xl text-slate-400 group-hover:translate-x-1 transition">›</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-sm">DECHTA Logistics Platform · v1.0</p>
      </div>

      {/* Info Box */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-md text-sm text-slate-300 mb-4 mx-auto">
        <p className="mb-2 font-semibold text-slate-200">� Single App - All Roles</p>
        <ul className="space-y-1 text-xs">
          <li>• All roles run in <strong>this single page</strong></li>
          <li>• No new tabs opened</li>
          <li>• Switch roles anytime by clicking </li>
          <li>• Logout returns to this welcome page</li>
        </ul>
      </div>

      {/* Language Modal */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Select Language</h2>
            <div className="space-y-3 mb-6">
              {[
                { code: 'en', label: 'English', flag: '🇺🇸' },
                { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
                { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.code);
                    setShowLangModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition flex justify-between items-center ${
                    selectedLang === lang.code
                      ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <span className="font-semibold">{lang.label}</span>
                  <span>{lang.flag}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLangModal(false)}
              className="w-full py-2 text-slate-400 hover:text-slate-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
