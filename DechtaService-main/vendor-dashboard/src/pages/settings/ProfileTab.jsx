import { Input } from '../../components/ui/Input';
import { DocumentUploader } from './DocumentUploader';
import { validate } from './KYCService';

const BUSINESS_TYPES = [
  'Sole Proprietorship', 'Partnership', 'LLP',
  'Private Limited', 'Public Limited', 'OPC', 'Other',
];

export const ProfileTab = ({ data, docs, onChange, onDocsChange, disabled }) => {
  const f = data || {};
  const u = (k, v) => onChange({ ...f, [k]: v });

  const aadhaarErr = f.aadhaar && !validate.aadhaar(f.aadhaar) ? 'Must be 12 digits' : '';
  const panErr     = f.pan     && !validate.pan(f.pan)         ? 'Format: AAAAA9999A' : '';

  return (
    <div className="space-y-5 fade-in">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Full Name" value={f.name || ''} onChange={e => u('name', e.target.value)} readOnly={disabled} placeholder="Owner / Contact Name" />
        <Input label="Location"  value={f.location || ''} onChange={e => u('location', e.target.value)} readOnly={disabled} placeholder="City, State" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Area" value={f.area || ''} onChange={e => u('area', e.target.value)} readOnly={disabled} placeholder="Area / Locality" />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type of Business</label>
          {disabled ? (
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white opacity-60">
              {f.businessType || '—'}
            </div>
          ) : (
            <select value={f.businessType || ''} onChange={e => u('businessType', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#0ceded] dark:border-slate-800 dark:bg-slate-900 dark:text-white">
              <option value="">Select type...</option>
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Aadhaar Number */}
      <div className="space-y-1">
        <Input label="Aadhaar Number" value={f.aadhaar || ''} onChange={e => u('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
          readOnly={disabled} placeholder="12-digit Aadhaar number" />
        {aadhaarErr && <p className="text-[10px] text-red-500 pl-1">{aadhaarErr}</p>}
      </div>

      {/* PAN Number */}
      <div className="space-y-1">
        <Input label="PAN Number" value={f.pan || ''} onChange={e => u('pan', e.target.value.toUpperCase().slice(0, 10))}
          readOnly={disabled} placeholder="e.g. ABCDE1234F" />
        {panErr && <p className="text-[10px] text-red-500 pl-1">{panErr}</p>}
      </div>

      {/* KYC Documents */}
      <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">KYC Documents</h4>
        <div className="space-y-5">
          <DocumentUploader label="Aadhaar Card" docKey="aadhaar" docs={docs} onChange={onDocsChange} twoSided disabled={disabled} />
          <DocumentUploader label="PAN Card"     docKey="pan"     docs={docs} onChange={onDocsChange} twoSided disabled={disabled} />
        </div>
      </div>
    </div>
  );
};
