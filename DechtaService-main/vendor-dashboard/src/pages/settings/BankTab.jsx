import { Input } from '../../components/ui/Input';
import { DocumentUploader } from './DocumentUploader';
import { validate } from './KYCService';

export const BankTab = ({ data, docs, onChange, onDocsChange, disabled }) => {
  const f = data || {};
  const u = (k, v) => onChange({ ...f, [k]: v });

  const ifscErr = f.ifsc && !validate.ifsc(f.ifsc) ? 'IFSC must be 11 characters (e.g. SBIN0001234)' : '';

  return (
    <div className="space-y-5 fade-in">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Account Number" value={f.accountNo || ''}
          onChange={e => u('accountNo', e.target.value.replace(/\D/g, ''))}
          readOnly={disabled} placeholder="Bank account number" />
        <div className="space-y-1">
          <Input label="IFSC Code" value={f.ifsc || ''}
            onChange={e => u('ifsc', e.target.value.toUpperCase().slice(0, 11))}
            readOnly={disabled} placeholder="e.g. SBIN0001234" />
          {ifscErr && <p className="text-[10px] text-red-500 pl-1">{ifscErr}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Bank Name"   value={f.bankName   || ''} onChange={e => u('bankName',   e.target.value)} readOnly={disabled} placeholder="e.g. State Bank of India" />
        <Input label="Bank Branch" value={f.bankBranch || ''} onChange={e => u('bankBranch', e.target.value)} readOnly={disabled} placeholder="Branch name" />
      </div>

      {/* Bank Documents */}
      <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Bank Proof Documents</h4>
        <p className="text-[11px] text-gray-400 mb-3">Upload cancelled cheque, passbook, or any bank proof (multiple allowed)</p>
        <DocumentUploader label="Bank Proofs" docKey="bank_proofs" docs={docs} onChange={onDocsChange} multiple disabled={disabled} />
      </div>
    </div>
  );
};
