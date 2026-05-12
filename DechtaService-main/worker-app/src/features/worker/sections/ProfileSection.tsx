import { useState, useEffect } from 'react';
import { User, Edit2, Wrench, CheckCircle, Lock, Building, Gift, Copy, Share2, Camera, Upload, UploadCloud, AlertTriangle } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { SKILL_CATEGORIES, MAX_SKILLS, LOCATION_DATA, BANK_DATA } from '../workerConstants';
import { getBankDetails } from '../workerSupabase';

export default function ProfileSection() {
  const { state, setState, showToast, t } = useWorker();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);

  // Fetch bank details on mount if status is 'missing' but profile is complete
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (state.user.bankDetails.status === 'missing' && state.user.isProfileComplete) {
        setLoadingBankDetails(true);
        try {
          const res = await getBankDetails();
          const data = res?.data ?? res;
          if (data && data.accountNumber) {
            setState(p => ({
              ...p,
              user: {
                ...p.user,
                bankDetails: {
                  name: data.bankName || '',
                  branch: data.branch || '',
                  account: data.accountNumber || '',
                  ifsc: data.ifscCode || '',
                  passbookFile: null,
                  status: data.status || 'pending'
                },
                hasBankDetails: true
              }
            }));
          }
        } catch (err) {
          // Bank details not found or error - keep as missing
        } finally {
          setLoadingBankDetails(false);
        }
      }
    };
    fetchBankDetails();
  }, [state.user.isProfileComplete]);
  const [editName, setEditName] = useState(state.user.name);
  const [editState, setEditState] = useState(state.user.location.state);
  const [editCity, setEditCity] = useState(state.user.location.city);
  const [editArea, setEditArea] = useState(state.user.location.area);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const locString = state.user.location.area && state.user.location.city
    ? `${state.user.location.area}, ${state.user.location.city}`
    : state.user.location.city || state.user.location.state || 'Unknown Location';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(state.user.referralCode);
    showToast('Referral Code copied!', 'success');
  };

  const handleSaveProfile = () => {
    setState(p => ({
      ...p,
      user: {
        ...p.user,
        name: editName,
        location: { state: editState, city: editCity, area: editArea, address: p.user.location.address || '' }
      }
    }));
    setEditModalOpen(false);
    showToast('Profile Updated!', 'success');
  };

  const handleBankSubmit = () => {
    if (!bankName || !bankAccount) {
      showToast('Fill all details', 'error');
      return;
    }
    setState(p => ({
      ...p,
      user: {
        ...p.user,
        bankDetails: { name: bankName, branch: bankBranch, account: bankAccount, ifsc: bankIfsc, passbookFile: null, status: 'pending' }
      }
    }));
    setBankModalOpen(false);
    showToast('Bank details submitted for verification.', 'warning');
  };

  const cities = LOCATION_DATA[editState] || {};
  const areas = cities[editCity] || [];
  const bankBranches = BANK_DATA[bankName] || {};

  return (
    <div>
      {/* Header */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={20} className="icon" aria-hidden="true" /> {t('my_profile')}</div>
          <button className="w-btn w-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
            onClick={() => { setEditName(state.user.name); setEditState(state.user.location.state); setEditCity(state.user.location.city); setEditArea(state.user.location.area); setEditModalOpen(true); }}>
            <Edit2 size={12} aria-hidden="true" /> {t('edit_profile')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p className="w-profile-label">{t('status_label')}</p>
            <span className={`w-bank-status ${state.user.isApproved ? 'verified' : state.user.isProfileComplete ? 'pending' : 'missing'}`}>
              {state.user.isApproved ? 'Approved' : state.user.isProfileComplete ? 'Pending Approval' : 'Incomplete'}
            </span>
          </div>
          <div>
            <p className="w-profile-label">{t('working_area')}</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{locString}</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={20} className="icon" aria-hidden="true" /> {t('skills_label')}</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{state.user.selectedSkills.length} {t('selected_count')} {MAX_SKILLS} {t('selected_suffix')}</span>
        </div>
        {state.user.isProfileComplete ? (
          <>
            <div className="w-role-grid">
              {state.user.selectedSkills.map(skill => (
                <div key={skill} className="w-role-check checked">
                  <CheckCircle size={16} aria-hidden="true" style={{ marginRight: 6, color: 'var(--success)' }} /><span>{skill}</span>
                </div>
              ))}
            </div>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}><Lock size={12} aria-hidden="true" /> {t('skills_lock_msg')}</p>
          </>
        ) : (
          <div className="w-role-grid">
            {Object.values(SKILL_CATEGORIES).flat().map(skill => {
              const isSelected = state.user.selectedSkills.includes(skill);
              const isDisabled = !isSelected && state.user.selectedSkills.length >= MAX_SKILLS;
              return (
                <div key={skill}
                  className={`w-role-check ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isDisabled) { showToast(`Maximum ${MAX_SKILLS} skills allowed.`, 'error'); return; }
                    setState(p => ({
                      ...p,
                      user: {
                        ...p.user,
                        selectedSkills: isSelected
                          ? p.user.selectedSkills.filter(s => s !== skill)
                          : [...p.user.selectedSkills, skill]
                      }
                    }));
                  }}>
                  {isSelected ? <CheckCircle size={16} aria-hidden="true" style={{ marginRight: 6, color: 'var(--success)' }} /> : <div style={{ width: 16, height: 16, marginRight: 6, borderRadius: '50%', border: '1px solid var(--card-border)' }} />}<span>{skill}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank Details */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building size={20} className="icon" aria-hidden="true" /> {t('bank_details_title')}</div>
        </div>

        {loadingBankDetails ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading bank details...
          </div>
        ) : (
          <>
            <span className={`w-bank-status ${state.user.isApproved ? 'verified' : state.user.bankDetails.status}`}>
              {t(`bank_status_${state.user.isApproved ? 'verified' : state.user.bankDetails.status}`)}
            </span>

            {(state.user.bankDetails.status === 'pending' || state.user.bankDetails.status === 'verified') ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div><p className="w-profile-label">{t('bank_name_label')}</p><p style={{ fontWeight: 600, margin: 0 }}>{state.user.bankDetails.name || 'N/A'}</p></div>
                  <div><p className="w-profile-label">{t('account_label')}</p><p style={{ fontWeight: 600, margin: 0 }}>*** *** {state.user.bankDetails.account ? state.user.bankDetails.account.slice(-4) : '****'}</p></div>
                  <div><p className="w-profile-label">{t('ifsc_label')}</p><p style={{ fontWeight: 600, margin: 0 }}>{state.user.bankDetails.ifsc || 'N/A'}</p></div>
                </div>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}><Lock size={12} aria-hidden="true" /> {t('bank_lock_msg')}</p>
              </div>
            ) : (
              <button className="w-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}
                onClick={() => { setBankName(''); setBankBranch(''); setBankAccount(''); setBankIfsc(''); setBankModalOpen(true); }}>
                <Building size={16} aria-hidden="true" /> {t('add_bank_details')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Referral */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={20} className="icon" aria-hidden="true" /> {t('refer_earn')}</div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 10 }}>{t('refer_desc')}</p>
        <div className="w-referral-box">
          <span className="w-referral-code">{state.user.referralCode}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="w-btn w-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }} onClick={handleCopyReferral}>
              <Copy size={12} aria-hidden="true" /> {t('copy_btn')}
            </button>
            <button className="w-btn w-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }} onClick={() => showToast('Share link simulated', 'success')}>
              <Share2 size={12} aria-hidden="true" /> {t('send_referral')}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="w-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="w-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Edit2 size={18} aria-hidden="true" /> {t('edit_profile')}</h3>
            <p>{t('profile_edit_warning')}</p>
            <div className="w-profile-input-group">
              <label className="w-profile-label">Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="w-profile-input-group">
                <label className="w-profile-label">State</label>
                <select value={editState} onChange={e => { setEditState(e.target.value); setEditCity(''); setEditArea(''); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
                  <option value="">Select State</option>
                  {Object.keys(LOCATION_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label">City</label>
                <select value={editCity} onChange={e => { setEditCity(e.target.value); setEditArea(''); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
                  <option value="">Select City</option>
                  {Object.keys(cities).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label">Area</label>
                <select value={editArea} onChange={e => setEditArea(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
                  <option value="">Select Area</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="w-btn-primary" onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 }}><UploadCloud size={16} aria-hidden="true" /> {t('save_changes')}</button>
              <button className="w-btn w-btn-outline" onClick={() => setEditModalOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {bankModalOpen && (
        <div className="w-modal-overlay" onClick={() => setBankModalOpen(false)}>
          <div className="w-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building size={18} aria-hidden="true" /> {t('bank_details_title')}</h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} aria-hidden="true" style={{ color: 'var(--warning)' }} /> {t('bank_edit_warning')}</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="w-profile-input-group">
                <label className="w-profile-label">Bank Name</label>
                <select value={bankName} onChange={e => { setBankName(e.target.value); setBankBranch(''); setBankIfsc(''); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
                  <option value="">Select Bank Name</option>
                  {Object.keys(BANK_DATA).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label">Branch</label>
                <select value={bankBranch} disabled={!bankName}
                  onChange={e => { setBankBranch(e.target.value); setBankIfsc(bankBranches[e.target.value] || ''); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
                  <option value="">Select Branch</option>
                  {Object.keys(bankBranches).map(br => <option key={br} value={br}>{br}</option>)}
                </select>
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label">Account Number</label>
                <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                  placeholder="Account Number"
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.8)', color: 'var(--text-main)', fontFamily: 'inherit' }} />
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label">IFSC Code</label>
                <input type="text" value={bankIfsc} readOnly
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontFamily: 'inherit' }} />
              </div>
              <div className="w-profile-input-group">
                <label className="w-profile-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Copy size={12} aria-hidden="true" /> {t('upload_passbook')} (or Cheque)</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <label className="w-btn w-btn-outline" style={{ position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text-main)' }}>
                    <Camera size={16} aria-hidden="true" /> Camera
                    <input type="file" accept="image/*" capture="environment" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  </label>
                  <label className="w-btn w-btn-outline" style={{ position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text-main)' }}>
                    <Upload size={16} aria-hidden="true" /> Gallery
                    <input type="file" accept="image/*,application/pdf" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="w-btn-primary" onClick={handleBankSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 }}><UploadCloud size={16} aria-hidden="true" /> {t('submit_bank_details')}</button>
              <button className="w-btn w-btn-outline" onClick={() => setBankModalOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
