import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWorker } from './WorkerContext';
import { workerRegisterProfile } from './workerSupabase';

interface WorkerSignupScreenProps {
  phone: string;
  otp: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function WorkerSignupScreen({
  phone,
  otp,
  onSuccess,
  onBack,
}: WorkerSignupScreenProps) {
  const { state, setState, showToast, t } = useWorker();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [state_value, setState_value] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const skillCategories = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Painting',
    'AC Repair',
    'Appliance Repair',
    'Cleaning',
    'Gardening',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }

    if (!skillCategory) {
      showToast('Please select a skill category', 'error');
      return;
    }

    if (!state_value.trim() || !city.trim()) {
      showToast('Please enter state and city', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await workerRegisterProfile({
        mobile: phone,
        otp,
        name: fullName,
        skillCategory,
        state: state_value,
        city,
        area,
        address,
      });

      // Store token
      if (result.token) {
        localStorage.setItem('dechta_worker_token', result.token);
      }

      const worker = result.worker;
      const workerId = String(worker?.id ?? worker?.workerId ?? worker?.profileId ?? '').trim();

      // Update state with complete profile
      setState(p => ({
        ...p,
        isLoggedIn: true,
        loginStartTime: Date.now(),
        user: {
          ...p.user,
          id: workerId,
          phone: phone,
          name: worker?.fullName || fullName,
          qualification: skillCategory,
          location: {
            state: state_value,
            city: city,
            area: area,
            address: address,
          },
          isProfileComplete: true,
          isApproved: worker?.isApproved || false,
          isDocumentsSubmitted: false,
          selectedCategory: skillCategory,
          selectedSkills: [],
          aadharNumber: '',
          panNumber: '',
          idProofType: 'Aadhaar',
        },
        isPremium: worker?.isPremium || false,
        isFrozen: worker?.isFrozen || false,
      }));

      showToast('Profile created successfully!', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to create profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="worker-auth">
      <div className="auth-top-actions">
        <div></div>
        <div></div>
      </div>

      <div className="auth-card w-glass" style={{ maxWidth: 450 }}>
        {/* Header */}
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            marginBottom: 12,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
          Complete Your Profile
        </h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Let us know more about you to get started
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          {/* Skill Category */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              Skill Category *
            </label>
            <select
              value={skillCategory}
              onChange={e => setSkillCategory(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: skillCategory ? '#ffffff' : '#94a3b8',
                fontSize: '14px',
                fontFamily: 'inherit',
                appearance: 'auto',
              }}
            >
              <option value="" style={{ background: '#1e293b', color: '#94a3b8' }}>
                Select a skill category
              </option>
              {skillCategories.map(cat => (
                <option key={cat} value={cat} style={{ background: '#1e293b', color: '#f1f5f9' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              State *
            </label>
            <input
              type="text"
              placeholder="e.g., Maharashtra"
              value={state_value}
              onChange={e => setState_value(e.target.value)}
              required
            />
          </div>

          {/* City */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              City *
            </label>
            <input
              type="text"
              placeholder="e.g., Mumbai"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
          </div>

          {/* Area */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              Area
            </label>
            <input
              type="text"
              placeholder="e.g., Bandra"
              value={area}
              onChange={e => setArea(e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="w-field">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              Address
            </label>
            <textarea
              placeholder="Enter your full address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            className="w-btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Creating Profile...' : 'Create Profile & Continue'}
          </button>
        </form>

        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
          🔒 Your information is secure
        </p>
      </div>
    </div>
  );
}
