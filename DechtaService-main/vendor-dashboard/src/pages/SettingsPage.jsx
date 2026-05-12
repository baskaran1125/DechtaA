import { useState, useEffect, useMemo } from 'react';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { ProfileImageUploader } from './settings/ProfileImageUploader';
import { ProfileTab } from './settings/ProfileTab';
import { CompanyTab } from './settings/CompanyTab';
import { BankTab } from './settings/BankTab';
import { AddressTab } from './settings/AddressTab';
import {
  loadKYC,
  saveKYC,
  submitForVerification,
  STATUS,
  buildKycFromVendor,
  buildVendorUpdatePayload,
  normalizeVerificationStatus,
  validate,
} from './settings/KYCService';

const TABS = ['Profile Details', 'Company Details', 'Bank Details', 'Address Details'];

const StatusBadge = ({ status }) => {
  const map = {
    [STATUS.DRAFT]: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400' },
    [STATUS.PENDING_VERIFICATION]: { label: 'Pending Verification', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    [STATUS.APPROVED]: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    [STATUS.REJECTED]: { label: 'Rejected', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  };
  const { label, color } = map[status] || map[STATUS.DRAFT];
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${color}`}>{label}</span>;
};

const VerificationBanner = ({ status }) => {
  if (status === STATUS.DRAFT) return null;
  const cfg = {
    [STATUS.PENDING_VERIFICATION]: {
      bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: 'Pending',
      text: 'Verification in progress. Admin is reviewing your documents.',
    },
    [STATUS.APPROVED]: {
      bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: 'Verified',
      text: 'Your account is verified and active on DECHTA Marketplace.',
    },
    [STATUS.REJECTED]: {
      bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: 'Rejected',
      text: 'Verification was rejected. Update details and submit again.',
    },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium mb-4 ${c.bg}`}>
      <span className="text-xs font-black uppercase tracking-wide">{c.icon}</span>
      <span className="text-gray-700 dark:text-gray-300 text-xs">{c.text}</span>
    </div>
  );
};

const SettingsPage = ({ vendor, updateVendor, notify }) => {
  const [kyc, setKyc] = useState(() => buildKycFromVendor(vendor, loadKYC(vendor)));
  const [tab, setTab] = useState(0);
  const [prefs, setPrefs] = useState({ email: true, sms: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const localForVendor = loadKYC(vendor);
    const next = buildKycFromVendor(vendor, localForVendor);
    setKyc(next);
    saveKYC(next, vendor);
  }, [vendor]);

  const status = useMemo(
    () => normalizeVerificationStatus(vendor?.verificationStatus || vendor?.verification_status || kyc?.verificationStatus),
    [kyc?.verificationStatus, vendor?.verificationStatus, vendor?.verification_status]
  );
  const profileComplete =
    vendor?.profileComplete === true ||
    vendor?.profile_complete === true ||
    vendor?.user_profile_complete === true ||
    String(vendor?.profileComplete || vendor?.profile_complete || vendor?.user_profile_complete || '').trim().toLowerCase() === 'true' ||
    Number(vendor?.profileComplete || vendor?.profile_complete || vendor?.user_profile_complete || 0) === 1;
  const pendingLocked = status === STATUS.PENDING_VERIFICATION && (!!kyc?.submittedAt || profileComplete);
  const disabled = pendingLocked || status === STATUS.APPROVED;
  const submissionReady = useMemo(() => {
    const p = kyc.profileDetails || {};
    const c = kyc.companyDetails || {};
    const b = kyc.bankDetails || {};
    const d = kyc.documents || {};

    const hasName = !!String(p.name || '').trim();
    const hasAadhaar = validate.aadhaar(p.aadhaar);
    const hasPan = validate.pan(p.pan);
    const hasCompanyName = !!String(c.companyName || '').trim();
    const hasAccountNo = !!String(b.accountNo || '').trim();
    const hasIfsc = validate.ifsc(b.ifsc);
    const hasAadhaarDocs = !!(d.aadhaar_front && d.aadhaar_back);
    const hasPanDocs = !!(d.pan_front && d.pan_back);
    const hasGstDoc = !!d.gst_certificate;
    const bankProofs = Array.isArray(d.bank_proofs) ? d.bank_proofs.filter(Boolean) : [];
    const hasBankProof = bankProofs.length > 0;

    return (
      hasName &&
      hasAadhaar &&
      hasPan &&
      hasCompanyName &&
      hasAccountNo &&
      hasIfsc &&
      hasAadhaarDocs &&
      hasPanDocs &&
      hasGstDoc &&
      hasBankProof
    );
  }, [kyc]);

  const persist = (updated) => {
    const next = {
      ...updated,
      verificationStatus: normalizeVerificationStatus(updated?.verificationStatus),
    };
    setKyc(next);
    saveKYC(next, vendor);
  };

  const syncKycToBackend = async ({ submittedForVerification: submit }) => {
    const localBase = submit ? submitForVerification(kyc, vendor) : saveKYC(kyc, vendor);
    const payload = buildVendorUpdatePayload(localBase, vendor, { submittedForVerification: submit });
    const updatedVendor = await updateVendor(payload);

    const hydrated = buildKycFromVendor(updatedVendor || vendor, localBase);
    if (submit && hydrated.verificationStatus === STATUS.DRAFT) {
      hydrated.verificationStatus = STATUS.PENDING_VERIFICATION;
      hydrated.submittedAt = new Date().toISOString();
    }
    persist(hydrated);
    return updatedVendor;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await syncKycToBackend({ submittedForVerification: false });
      notify('Draft saved successfully.', 'success');
    } catch {
      notify('Failed to save draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const p = kyc.profileDetails || {};
    const c = kyc.companyDetails || {};
    const b = kyc.bankDetails || {};
    const d = kyc.documents || {};

    if (!p.name) return notify('Profile: Name is required', 'error');
    if (!validate.aadhaar(p.aadhaar)) return notify('Profile: Valid 12-digit Aadhaar required', 'error');
    if (!validate.pan(p.pan)) return notify('Profile: Valid PAN required', 'error');
    if (!c.companyName) return notify('Company: Company name is required', 'error');
    if (!b.accountNo) return notify('Bank: Account number is required', 'error');
    if (!validate.ifsc(b.ifsc)) return notify('Bank: Valid IFSC required', 'error');
    if (!d.aadhaar_front || !d.aadhaar_back) return notify('Profile: Aadhaar front & back required', 'error');
    if (!d.pan_front || !d.pan_back) return notify('Profile: PAN front & back required', 'error');
    if (!d.gst_certificate) return notify('Company: GST certificate required', 'error');
    const bankProofs = Array.isArray(d.bank_proofs) ? d.bank_proofs.filter(Boolean) : [];
    if (bankProofs.length === 0) return notify('Bank: Upload at least one bank proof', 'error');

    setSaving(true);
    try {
      await syncKycToBackend({ submittedForVerification: true });
      notify('Submitted for verification. Waiting for admin approval.', 'success');
    } catch {
      notify('Submission failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const marketplaceEnabled = status === STATUS.APPROVED;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-4">
          <ProfileImageUploader
            image={kyc.profileImage}
            name={kyc.profileDetails?.name || vendor?.ownerName}
            disabled={disabled}
            onChange={(img) => persist({ ...kyc, profileImage: img })}
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-base truncate">
              {kyc.profileDetails?.name || vendor?.ownerName || 'Your Name'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {kyc.companyDetails?.companyName || vendor?.shopName || 'Your Shop'}
            </div>
            <div className="mt-1.5"><StatusBadge status={status} /></div>
          </div>
        </div>

        <div className="flex gap-1 mt-5 bg-gray-50 dark:bg-slate-800 rounded-xl p-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                tab === i
                  ? 'bg-white dark:bg-slate-900 text-[#0ceded] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <VerificationBanner status={status} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mb-4">
        {tab === 0 && (
          <ProfileTab
            data={kyc.profileDetails}
            docs={kyc.documents}
            onChange={(v) => persist({ ...kyc, profileDetails: v })}
            onDocsChange={(v) => persist({ ...kyc, documents: v })}
            disabled={disabled}
          />
        )}
        {tab === 1 && (
          <CompanyTab
            data={kyc.companyDetails}
            docs={kyc.documents}
            onChange={(v) => persist({ ...kyc, companyDetails: v })}
            onDocsChange={(v) => persist({ ...kyc, documents: v })}
            disabled={disabled}
          />
        )}
        {tab === 2 && (
          <BankTab
            data={kyc.bankDetails}
            docs={kyc.documents}
            onChange={(v) => persist({ ...kyc, bankDetails: v })}
            onDocsChange={(v) => persist({ ...kyc, documents: v })}
            disabled={disabled}
          />
        )}
        {tab === 3 && (
          <AddressTab
            data={kyc.profileDetails}
            onChange={(v) => persist({ ...kyc, profileDetails: v })}
            disabled={disabled}
          />
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Seller Account Status</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {marketplaceEnabled ? 'Visible on DECHTA Marketplace' : 'Requires verified account'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold ${vendor?.isActive ? 'text-green-500' : 'text-gray-400'}`}>
              {vendor?.isActive ? 'Active' : 'Inactive'}
            </span>
            <ToggleSwitch
              checked={!!vendor?.isActive && marketplaceEnabled}
              onChange={(v) => marketplaceEnabled
                ? updateVendor({ isActive: v })
                : notify('Account must be verified to toggle visibility', 'error')}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Notifications</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Email Notifications</span>
              <ToggleSwitch checked={prefs.email} onChange={(v) => { setPrefs((p) => ({ ...p, email: v })); notify('Updated', 'info'); }} />
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">SMS Alerts</span>
              <ToggleSwitch checked={prefs.sms} onChange={(v) => { setPrefs((p) => ({ ...p, sms: v })); notify('Updated', 'info'); }} />
            </div>
          </div>
        </div>

        <button
          onClick={() => notify('Support Ticket Created', 'info')}
          className="w-full border border-gray-200 dark:border-slate-700 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-gray-300"
        >
          Contact Support
        </button>
      </div>

      {!disabled && (
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !submissionReady}
            className="flex-1 py-3 rounded-xl bg-[#0ceded] hover:opacity-90 text-black text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </div>
      )}

      {disabled && status === STATUS.PENDING_VERIFICATION && (
        <div className="text-center text-xs text-gray-400 py-3">
          Editing is locked while verification is in progress.
        </div>
      )}
      {disabled && status === STATUS.APPROVED && (
        <div className="text-center text-xs text-green-500 font-bold py-3">
          Account verified. Contact support to update locked details.
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
