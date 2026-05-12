import { Input } from '../../components/ui/Input';
import { DocumentUploader } from './DocumentUploader';
import { validate } from './KYCService';

export const CompanyTab = ({ data, docs, onChange, onDocsChange, disabled }) => {
  const f = data || {};
  const u = (k, v) => onChange({ ...f, [k]: v });

  const gstErr  = f.gst      && !validate.gst(f.gst)           ? 'Invalid GST format' : '';

  return (
    <div className="space-y-5 fade-in">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Company Name" value={f.companyName || ''} onChange={e => u('companyName', e.target.value)} readOnly={disabled} placeholder="Registered company name" />
        <Input label="Registration No. (UDYAM / CIN)" value={f.regNo || ''} onChange={e => u('regNo', e.target.value.toUpperCase())} readOnly={disabled} placeholder="UDYAM-XX-XX-XXXXXXX" />
      </div>

      {/* GST */}
      <div className="space-y-1">
        <Input label="GST Number" value={f.gst || ''} onChange={e => u('gst', e.target.value.toUpperCase().slice(0, 15))} readOnly={disabled} placeholder="e.g. 22AAAAA0000A1Z5" />
        {gstErr && <p className="text-[10px] text-red-500 pl-1">{gstErr}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Shop PAN Number" value={f.shopPan || ''} onChange={e => u('shopPan', e.target.value.toUpperCase().slice(0, 10))} readOnly={disabled} placeholder="e.g. ABCDE1234F" />
        <Input label="Company Location" value={f.companyLocation || ''} onChange={e => u('companyLocation', e.target.value)} readOnly={disabled} placeholder="Registered office address" />
      </div>

      {/* GST Certificate */}
      <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Company Documents</h4>
        <DocumentUploader label="GST Certificate" docKey="gst_certificate" docs={docs} onChange={onDocsChange} disabled={disabled} />
      </div>
    </div>
  );
};
