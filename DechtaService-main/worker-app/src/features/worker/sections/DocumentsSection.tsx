import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Check, X, AlertCircle, FileText, DollarSign, User, Building } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { getWorkerProfile, uploadWorkerDocuments, submitBankDetails } from '../workerSupabase';

export default function DocumentsSection() {
  const { state, setState, showToast, t } = useWorker();
  
  // Document states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [qualification, setQualification] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharFrontFile, setAadharFrontFile] = useState<File | null>(null);
  const [aadharBackFile, setAadharBackFile] = useState<File | null>(null);
  const [panNumber, setPanNumber] = useState('');
  const [panFrontFile, setPanFrontFile] = useState<File | null>(null);
  const [panBackFile, setPanBackFile] = useState<File | null>(null);
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [mandateFile, setMandateFile] = useState<File | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(state.user.isDocumentsSubmitted || false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'aadhar-front' | 'aadhar-back' | 'pan-front' | 'pan-back' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Video play failed:', err));
    }
  }, [stream]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedDocuments = async () => {
      try {
        const res = await getWorkerProfile();
        const worker = res?.worker || res?.data?.worker;
        if (!worker || cancelled) return;

        const resolvedQualification = String(worker?.qualification || '').trim();
        const resolvedAadharNumber = String(worker?.aadharNumber || '').trim();
        const resolvedPanNumber = String(worker?.panNumber || '').trim();
        const resolvedSubmitted = Boolean(worker?.isDocumentsSubmitted ?? worker?.is_documents_submitted ?? false);

        if (resolvedQualification) setQualification(resolvedQualification);
        if (resolvedAadharNumber) setAadharNumber(resolvedAadharNumber);
        if (resolvedPanNumber) setPanNumber(resolvedPanNumber);
        setSubmitted(resolvedSubmitted);

        setState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            qualification: resolvedQualification || prev.user.qualification,
            aadharNumber: resolvedAadharNumber || prev.user.aadharNumber,
            panNumber: resolvedPanNumber || prev.user.panNumber,
            isDocumentsSubmitted: resolvedSubmitted || prev.user.isDocumentsSubmitted,
          }
        }));
      } catch {
        // Keep the local form state if the profile fetch fails.
      }
    };

    loadSavedDocuments();

    return () => {
      cancelled = true;
    };
  }, [setState]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async (mode: 'photo' | 'aadhar-front' | 'aadhar-back' | 'pan-front' | 'pan-back') => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraMode(mode);
      setStream(mediaStream);
    } catch (err) {
      showToast('Camera access denied. Please allow camera permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraMode(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraMode) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `${cameraMode}_${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          
          if (cameraMode === 'photo') setPhotoFile(file);
          else if (cameraMode === 'aadhar-front') setAadharFrontFile(file);
          else if (cameraMode === 'aadhar-back') setAadharBackFile(file);
          else if (cameraMode === 'pan-front') setPanFrontFile(file);
          else if (cameraMode === 'pan-back') setPanBackFile(file);
          
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmitDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!photoFile) {
      showToast('Please upload a photo', 'error');
      return;
    }
    if (!qualification.trim()) {
      showToast('Please enter your qualification', 'error');
      return;
    }
    if (!aadharNumber.trim()) {
      showToast('Please enter your Aadhar number', 'error');
      return;
    }
    if (!aadharFrontFile || !aadharBackFile) {
      showToast('Please upload both front and back of Aadhar', 'error');
      return;
    }
    if (!panNumber.trim()) {
      showToast('Please enter your PAN number', 'error');
      return;
    }
    if (!panFrontFile || !panBackFile) {
      showToast('Please upload both front and back of PAN', 'error');
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !branchName.trim()) {
      showToast('Please fill all bank details', 'error');
      return;
    }
    if (!mandateFile) {
      showToast('Please upload bank mandate', 'error');
      return;
    }

    setLoading(true);
    try {
      // Upload documents
      await uploadWorkerDocuments({
        qualification,
        aadharNumber,
        panNumber,
        photoFile,
        aadharFrontFile,
        aadharBackFile,
        panFrontFile,
        panBackFile,
        passbookFile: mandateFile,
      });

      // Submit bank details
      await submitBankDetails({
        bankName,
        branch: branchName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
      });

      // Update state
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          isDocumentsSubmitted: true,
          bankDetails: {
            name: bankName,
            branch: branchName,
            account: accountNumber,
            ifsc: ifscCode,
            passbookFile: mandateFile,
            status: 'submitted'
          }
        }
      }));
      
      setSubmitted(true);
      showToast('Documents submitted successfully! Your documents are under review.', 'success');
    } catch (err) {
      showToast(`Document submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Camera view
  if (cameraMode) {
    return (
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="w-glass w-card" style={{ maxWidth: 500 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>
            Capture {cameraMode.replace('-', ' ')}
          </h3>
          <video
            ref={videoRef}
            style={{ width: '100%', borderRadius: '8px', marginBottom: 16, backgroundColor: '#000', aspectRatio: '4/3' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              onClick={capturePhoto}
              className="w-btn w-btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Camera size={16} /> CAPTURE
            </button>
            <button
              onClick={stopCamera}
              className="w-btn w-btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <X size={16} /> CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Status message
  if (submitted) {
    return (
      <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="w-glass w-card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <Check size={48} style={{ margin: '0 auto 16px', color: 'var(--success)' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Documents Submitted</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 14 }}>
            Your documents have been submitted for verification. You'll be notified once they're reviewed.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            You can now go online once approved. Check your notifications for updates.
          </p>
        </div>
      </div>
    );
  }

  // Document upload form
  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
      {/* Photo */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} className="icon" aria-hidden="true" /> PHOTO
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={() => startCamera('photo')}
            className="w-btn w-btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Camera size={16} /> TAKE PHOTO
          </button>
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setPhotoFile)}
              style={{ display: 'none' }}
            />
            <div
              className="w-btn w-btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Upload size={16} /> UPLOAD
            </div>
          </label>
        </div>
        {photoFile && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', marginTop: 12, fontSize: 12 }}>
            <Check size={16} /> {photoFile.name}
          </p>
        )}
      </div>

      {/* Qualification */}
      <div className="w-glass w-card">
        <p className="w-profile-label">QUALIFICATION</p>
        <input
          type="text"
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          placeholder="Diploma in Electrical Engineering"
          className="w-form-input"
          style={{ width: '100%', color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Aadhar */}
      <div className="w-glass w-card">
        <p className="w-profile-label">AADHAR NUMBER</p>
        <input
          type="text"
          value={aadharNumber}
          onChange={(e) => setAadharNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="Aadhar number"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 16, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
          maxLength={12}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p className="w-profile-label" style={{ marginBottom: 8 }}>FRONT SIDE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => startCamera('aadhar-front')}
                className="w-btn w-btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, padding: '8px' }}
              >
                <Camera size={14} /> CAPTURE
              </button>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setAadharFrontFile)}
                  style={{ display: 'none' }}
                />
                <div
                  className="w-btn w-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '8px'
                  }}
                >
                  <Upload size={14} /> UPLOAD
                </div>
              </label>
            </div>
            {aadharFrontFile && (
              <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Done
              </p>
            )}
          </div>

          <div>
            <p className="w-profile-label" style={{ marginBottom: 8 }}>BACK SIDE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => startCamera('aadhar-back')}
                className="w-btn w-btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, padding: '8px' }}
              >
                <Camera size={14} /> CAPTURE
              </button>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setAadharBackFile)}
                  style={{ display: 'none' }}
                />
                <div
                  className="w-btn w-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '8px'
                  }}
                >
                  <Upload size={14} /> UPLOAD
                </div>
              </label>
            </div>
            {aadharBackFile && (
              <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Done
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PAN */}
      <div className="w-glass w-card">
        <p className="w-profile-label">PAN NUMBER</p>
        <input
          type="text"
          value={panNumber}
          onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="PAN number"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 16, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
          maxLength={10}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p className="w-profile-label" style={{ marginBottom: 8 }}>FRONT SIDE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => startCamera('pan-front')}
                className="w-btn w-btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, padding: '8px' }}
              >
                <Camera size={14} /> CAPTURE
              </button>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setPanFrontFile)}
                  style={{ display: 'none' }}
                />
                <div
                  className="w-btn w-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '8px'
                  }}
                >
                  <Upload size={14} /> UPLOAD
                </div>
              </label>
            </div>
            {panFrontFile && (
              <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Done
              </p>
            )}
          </div>

          <div>
            <p className="w-profile-label" style={{ marginBottom: 8 }}>BACK SIDE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => startCamera('pan-back')}
                className="w-btn w-btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, padding: '8px' }}
              >
                <Camera size={14} /> CAPTURE
              </button>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setPanBackFile)}
                  style={{ display: 'none' }}
                />
                <div
                  className="w-btn w-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '8px'
                  }}
                >
                  <Upload size={14} /> UPLOAD
                </div>
              </label>
            </div>
            {panBackFile && (
              <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Done
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="w-glass w-card">
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={20} className="icon" aria-hidden="true" /> BANK DETAILS
          </div>
        </div>
        
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="Bank Name"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 12, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
        />
        
        <input
          type="text"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          placeholder="Branch"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 12, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
        />
        
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Account Number"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 12, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
        />
        
        <input
          type="text"
          value={ifscCode}
          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
          placeholder="IFSC Code"
          className="w-form-input"
          style={{ width: '100%', marginBottom: 16, color: 'inherit', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
        />
        
        <p className="w-profile-label">BANK MANDATE</p>
        <label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileUpload(e, setMandateFile)}
            style={{ display: 'none' }}
          />
          <div
            style={{
              border: '2px dashed var(--primary)',
              borderRadius: '8px',
              padding: 16,
              cursor: 'pointer',
              textAlign: 'center',
              backgroundColor: 'rgba(59, 130, 246, 0.05)'
            }}
          >
            <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Click to upload mandate</p>
          </div>
        </label>
        {mandateFile && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', marginTop: 12, fontSize: 12 }}>
            <Check size={16} /> {mandateFile.name}
          </p>
        )}
      </div>

      {/* Warning */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, padding: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 8, border: '1px solid rgba(255, 193, 7, 0.3)' }}>
        <AlertCircle size={20} style={{ color: 'rgb(255, 193, 7)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'rgb(255, 193, 7)', margin: 0, marginBottom: 4 }}>Required to go online</p>
          <p style={{ fontSize: 12, color: 'rgb(255, 193, 7)', margin: 0 }}>You must submit all documents to be able to go online and accept jobs.</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitDocuments}
        disabled={loading}
        className="w-btn w-btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 16,
          fontWeight: 600,
          padding: '12px 24px',
          opacity: loading ? 0.5 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Uploading...
          </>
        ) : (
          <>
            <Check size={18} />
            Submit Documents
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input[type="text"]::placeholder {
          color: var(--text-muted, rgba(156, 163, 175, 0.6)) !important;
          opacity: 1;
        }
        
        input[type="text"]::-webkit-input-placeholder {
          color: var(--text-muted, rgba(156, 163, 175, 0.6)) !important;
          opacity: 1;
        }
        
        input[type="text"]::-moz-placeholder {
          color: var(--text-muted, rgba(156, 163, 175, 0.6)) !important;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
