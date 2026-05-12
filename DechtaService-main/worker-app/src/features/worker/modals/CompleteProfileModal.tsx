import { useState, useRef, useEffect } from 'react';
import { Upload, User, MapPin, Building, CreditCard, Briefcase, Camera, X, RotateCcw, Check } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { LOCATION_DATA, SKILL_CATEGORIES, MAX_SKILLS } from '../workerConstants';

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (profileData: ProfileData) => void;
}

export interface ProfileData {
  photoFile: File | null;
  qualification: string;
  aadharNumber: string;
  aadharFile: File | null;  // Single PDF or combined file
  aadharFrontFile: File | null;  // For camera capture
  aadharBackFile: File | null;   // For camera capture
  panNumber: string;
  panFile: File | null;  // Single PDF or combined file
  panFrontFile: File | null;  // For camera capture
  panBackFile: File | null;   // For camera capture
  bankAccount: string;
  ifsc: string;
  bankName: string;
  branch: string;
  passbookFile: File | null;
  locState: string;
  locCity: string;
  locArea: string;
  address: string;
  selectedSkills: string[];
}

// Document Upload Component with Camera Support
interface DocumentUploadProps {
  label: string;
  pdfFile: File | null;  // For upload mode (single PDF)
  frontFile: File | null;  // For camera mode
  backFile: File | null;   // For camera mode
  onPdfChange: (file: File | null) => void;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
}

function DocumentUpload({ label, pdfFile, frontFile, backFile, onPdfChange, onFrontChange, onBackChange }: DocumentUploadProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [activeSide, setActiveSide] = useState<'front' | 'back' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Connect stream to video element when both are ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Video play failed:', err));
    }
  }, [stream, activeSide]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async (side: 'front' | 'back') => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setActiveSide(side);
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Unable to access camera. Please allow camera permissions or use upload option.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setActiveSide(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && activeSide) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `${label.toLowerCase()}_${activeSide}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (activeSide === 'front') {
              onFrontChange(file);
            } else {
              onBackChange(file);
            }
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onPdfChange(e.target.files[0]);
    }
  };

  const getPreviewUrl = (file: File | null): string | undefined => {
    return file ? URL.createObjectURL(file) : undefined;
  };

  const isPdf = (file: File | null) => {
    return file?.type === 'application/pdf';
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className={`w-btn ${mode === 'upload' ? 'w-btn-primary' : 'w-btn-outline'}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px' }}
          onClick={() => { setMode('upload'); stopCamera(); }}
        >
          <Upload size={14} /> Upload PDF
        </button>
        <button
          type="button"
          className={`w-btn ${mode === 'camera' ? 'w-btn-primary' : 'w-btn-outline'}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px' }}
          onClick={() => setMode('camera')}
        >
          <Camera size={14} /> Camera
        </button>
      </div>

      {/* Camera View */}
      {activeSide && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div style={{ color: 'white', marginBottom: 10, fontSize: 14 }}>
            Capture {label} - {activeSide.toUpperCase()} Side
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, border: '2px solid var(--logo-accent)' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
            <button
              type="button"
              className="w-btn"
              style={{ background: 'var(--danger)', color: 'white', padding: '12px 24px', borderRadius: 8 }}
              onClick={stopCamera}
            >
              <X size={18} /> Cancel
            </button>
            <button
              type="button"
              className="w-btn"
              style={{ background: 'var(--success)', color: 'white', padding: '12px 32px', borderRadius: 8 }}
              onClick={capturePhoto}
            >
              <Camera size={18} /> Capture
            </button>
          </div>
        </div>
      )}

      {/* Upload Mode - Single PDF Upload */}
      {mode === 'upload' && (
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
          background: pdfFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
          borderColor: pdfFile ? 'var(--success)' : 'var(--border)',
          position: 'relative'
        }}>
          {pdfFile && (
            <button
              type="button"
              onClick={() => onPdfChange(null)}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'var(--danger)', border: 'none', borderRadius: '50%',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white'
              }}
            >
              <X size={16} />
            </button>
          )}

          {pdfFile ? (
            <div>
              <div style={{
                width: 60, height: 70, margin: '0 auto 10px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '2px solid #ef4444',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>PDF</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>
                {pdfFile.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(pdfFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <>
              <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
                <CreditCard size={36} style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
                Upload {label} PDF
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Single PDF with front & back sides
              </div>
              <label className="w-btn w-btn-outline" style={{ cursor: 'pointer', fontSize: 12, padding: '8px 16px', display: 'inline-flex', gap: 6 }}>
                <Upload size={14} /> Choose PDF File
                <input type="file" style={{ display: 'none' }} accept=".pdf,application/pdf" onChange={handlePdfUpload} />
              </label>
            </>
          )}
        </div>
      )}

      {/* Camera Mode - Front & Back Capture */}
      {mode === 'camera' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Front Side */}
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
            background: frontFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
            borderColor: frontFile ? 'var(--success)' : 'var(--border)',
            position: 'relative'
          }}>
            {frontFile && (
              <button
                type="button"
                onClick={() => onFrontChange(null)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'var(--danger)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white'
                }}
              >
                <X size={14} />
              </button>
            )}

            {frontFile ? (
              <div>
                <img
                  src={getPreviewUrl(frontFile)}
                  alt="Front"
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                />
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Front Captured</span>
              </div>
            ) : (
              <>
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                  <CreditCard size={28} style={{ opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>FRONT SIDE</div>
                <button
                  type="button"
                  className="w-btn w-btn-outline"
                  style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', gap: 4 }}
                  onClick={() => startCamera('front')}
                >
                  <Camera size={12} /> Capture
                </button>
              </>
            )}
          </div>

          {/* Back Side */}
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
            background: backFile ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
            borderColor: backFile ? 'var(--success)' : 'var(--border)',
            position: 'relative'
          }}>
            {backFile && (
              <button
                type="button"
                onClick={() => onBackChange(null)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'var(--danger)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white'
                }}
              >
                <X size={14} />
              </button>
            )}

            {backFile ? (
              <div>
                <img
                  src={getPreviewUrl(backFile)}
                  alt="Back"
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                />
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Back Captured</span>
              </div>
            ) : (
              <>
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                  <RotateCcw size={28} style={{ opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>BACK SIDE</div>
                <button
                  type="button"
                  className="w-btn w-btn-outline"
                  style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', gap: 4 }}
                  onClick={() => startCamera('back')}
                >
                  <Camera size={12} /> Capture
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Single Photo Upload Component with Camera Support
interface PhotoUploadProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function PhotoUpload({ label, file, onFileChange }: PhotoUploadProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Connect stream to video element when both are ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Video play failed:', err));
    }
  }, [stream, cameraActive]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }
      });
      setCameraActive(true);
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Unable to access camera. Please allow camera permissions or use upload option.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `${label.toLowerCase()}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onFileChange(capturedFile);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  const getPreviewUrl = (f: File | null): string | undefined => {
    return f ? URL.createObjectURL(f) : undefined;
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className={`w-btn ${mode === 'upload' ? 'w-btn-primary' : 'w-btn-outline'}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px' }}
          onClick={() => { setMode('upload'); stopCamera(); }}
        >
          <Upload size={14} /> Upload
        </button>
        <button
          type="button"
          className={`w-btn ${mode === 'camera' ? 'w-btn-primary' : 'w-btn-outline'}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px' }}
          onClick={() => setMode('camera')}
        >
          <Camera size={14} /> Camera
        </button>
      </div>

      {/* Camera View */}
      {cameraActive && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div style={{ color: 'white', marginBottom: 10, fontSize: 14 }}>
            Capture {label}
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, border: '2px solid var(--logo-accent)' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
            <button
              type="button"
              className="w-btn"
              style={{ background: 'var(--danger)', color: 'white', padding: '12px 24px', borderRadius: 8 }}
              onClick={stopCamera}
            >
              <X size={18} /> Cancel
            </button>
            <button
              type="button"
              className="w-btn"
              style={{ background: 'var(--success)', color: 'white', padding: '12px 32px', borderRadius: 8 }}
              onClick={capturePhoto}
            >
              <Camera size={18} /> Capture
            </button>
          </div>
        </div>
      )}

      {/* Upload/Preview Area */}
      <div style={{
        border: '2px dashed var(--border)',
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
        background: file ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
        borderColor: file ? 'var(--success)' : 'var(--border)',
        position: 'relative'
      }}>
        {file && (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'var(--danger)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white'
            }}
          >
            <X size={16} />
          </button>
        )}

        {file ? (
          <div>
            <img
              src={getPreviewUrl(file)}
              alt="Preview"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '50%', marginBottom: 10, border: '3px solid var(--success)' }}
            />
            <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Photo Selected</div>
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
              <User size={40} style={{ opacity: 0.5 }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>{label}</div>
            {mode === 'upload' ? (
              <label className="w-btn w-btn-outline" style={{ cursor: 'pointer', fontSize: 12, padding: '8px 16px', display: 'inline-flex', gap: 6 }}>
                <Upload size={14} /> Choose Photo
                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
              </label>
            ) : (
              <button
                type="button"
                className="w-btn w-btn-outline"
                style={{ fontSize: 12, padding: '8px 16px', display: 'inline-flex', gap: 6 }}
                onClick={startCamera}
              >
                <Camera size={14} /> Open Camera
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CompleteProfileModal({ open, onClose, onComplete }: CompleteProfileModalProps) {
  const { showToast } = useWorker();

  // Form State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [qualification, setQualification] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharFile, setAadharFile] = useState<File | null>(null);  // PDF upload
  const [aadharFrontFile, setAadharFrontFile] = useState<File | null>(null);  // Camera capture
  const [aadharBackFile, setAadharBackFile] = useState<File | null>(null);     // Camera capture
  const [panNumber, setPanNumber] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);  // PDF upload
  const [panFrontFile, setPanFrontFile] = useState<File | null>(null);  // Camera capture
  const [panBackFile, setPanBackFile] = useState<File | null>(null);     // Camera capture
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [passbookFile, setPassbookFile] = useState<File | null>(null);
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locArea, setLocArea] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const cities = LOCATION_DATA[locState] || {};
  const areas = cities[locCity] || [];

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    if (e.target.files && e.target.files[0]) setter(e.target.files[0]);
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else if (prev.length < MAX_SKILLS) {
        return [...prev, skill];
      } else {
        showToast(`You can select up to ${MAX_SKILLS} skills only`, 'warning');
        return prev;
      }
    });
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!locState || !locCity || !locArea || selectedSkills.length === 0) {
      showToast('Please fill all mandatory fields (Location, at least 1 Skill)', 'error');
      return;
    }

    // Validate Aadhar number - must be exactly 12 digits
    if (aadharNumber.length !== 12) {
      showToast('Aadhar number must be exactly 12 digits', 'error');
      return;
    }

    onComplete({
      photoFile,
      qualification,
      aadharNumber,
      aadharFile,
      aadharFrontFile,
      aadharBackFile,
      panNumber,
      panFile,
      panFrontFile,
      panBackFile,
      bankAccount,
      ifsc,
      bankName,
      branch,
      passbookFile,
      locState,
      locCity,
      locArea,
      address,
      selectedSkills
    });
  };

  return (
    <div className="w-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="w-modal-content" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8 }}>Complete Your Profile</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Please provide the following details to access the job dashboard. <span style={{ color: 'var(--danger)' }}>All fields are mandatory.</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Personal Details */}
          <div className="form-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--logo-accent)' }}>
              <User size={16} /> Personal Details
            </h4>
            <div className="w-field">
              <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Profile Photo <span style={{ color: 'var(--danger)' }}>*</span></label>
              <PhotoUpload
                label="Profile Photo"
                file={photoFile}
                onFileChange={setPhotoFile}
              />
            </div>
            <div className="w-field" style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Qualification <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={qualification} onChange={e => setQualification(e.target.value)}>
                <option value="">Select Qualification *</option>
                <option value="10th">10th</option>
                <option value="12th">12th</option>
                <option value="Diploma">Diploma</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* Identity Proof */}
          <div className="form-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--logo-accent)' }}>
              <CreditCard size={16} /> Identity Proof
            </h4>

            {/* Aadhar Card */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Aadhar Number (12 digits) *"
                maxLength={12}
                value={aadharNumber}
                onChange={e => setAadharNumber(e.target.value.replace(/\D/g, ''))}
                style={{ marginBottom: 12, width: '100%', padding: '12px 14px', borderRadius: 8, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
              />
              <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>
                Aadhar Card <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <DocumentUpload
                label="Aadhar"
                pdfFile={aadharFile}
                frontFile={aadharFrontFile}
                backFile={aadharBackFile}
                onPdfChange={setAadharFile}
                onFrontChange={setAadharFrontFile}
                onBackChange={setAadharBackFile}
              />
            </div>

            {/* PAN Card */}
            <div>
              <input
                type="text"
                placeholder="PAN Number *"
                maxLength={10}
                value={panNumber}
                onChange={e => setPanNumber(e.target.value.toUpperCase())}
                style={{ marginBottom: 12, width: '100%', padding: '12px 14px', borderRadius: 8, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
              />
              <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>
                PAN Card <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <DocumentUpload
                label="PAN"
                pdfFile={panFile}
                frontFile={panFrontFile}
                backFile={panBackFile}
                onPdfChange={setPanFile}
                onFrontChange={setPanFrontFile}
                onBackChange={setPanBackFile}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="form-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--logo-accent)' }}>
              <Building size={16} /> Bank Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div className="w-field" style={{ margin: 0 }}>
                <input type="text" placeholder="Account Number *" value={bankAccount} onChange={e => setBankAccount(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="w-field" style={{ margin: 0 }}>
                <input type="text" placeholder="IFSC Code *" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} />
              </div>
              <div className="w-field" style={{ margin: 0 }}>
                <input type="text" placeholder="Bank Name *" value={bankName} onChange={e => setBankName(e.target.value)} />
              </div>
              <div className="w-field" style={{ margin: 0 }}>
                <input type="text" placeholder="Branch Name *" value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
            </div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>
              Passbook Photo / Cancelled Cheque <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <PhotoUpload
              label="Passbook/Cheque"
              file={passbookFile}
              onFileChange={setPassbookFile}
            />
          </div>

          {/* Address */}
          <div className="form-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--logo-accent)' }}>
              <MapPin size={16} /> Address of Service
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div className="w-field" style={{ margin: 0 }}>
                <select value={locState} onChange={e => { setLocState(e.target.value); setLocCity(''); setLocArea(''); }}>
                  <option value="">State *</option>
                  {Object.keys(LOCATION_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-field" style={{ margin: 0 }}>
                <select value={locCity} onChange={e => { setLocCity(e.target.value); setLocArea(''); }} disabled={!locState}>
                  <option value="">City *</option>
                  {Object.keys(cities).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-field" style={{ margin: 0 }}>
                <select value={locArea} onChange={e => setLocArea(e.target.value)} disabled={!locCity}>
                  <option value="">Area *</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="w-field">
              <textarea
                placeholder="Full Address *"
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Skills */}
          <div className="form-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--logo-accent)' }}>
              <Briefcase size={16} /> Skills
            </h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Select up to {MAX_SKILLS} skills * ({selectedSkills.length}/{MAX_SKILLS} selected)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.values(SKILL_CATEGORIES).flat().map(skill => {
                const isSelected = selectedSkills.includes(skill);
                const isDisabled = !isSelected && selectedSkills.length >= MAX_SKILLS;
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    disabled={isDisabled}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--logo-accent)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-dark)',
                      color: isSelected ? 'var(--logo-accent)' : isDisabled ? 'var(--text-muted)' : 'var(--text-main)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: isSelected ? '2px solid var(--logo-accent)' : '2px solid var(--border)',
                      background: isSelected ? 'var(--logo-accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isSelected && <Check size={14} style={{ color: 'var(--bg-darker)' }} />}
                    </div>
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <button className="w-btn-primary" onClick={handleSubmit} style={{ width: '100%' }}>
              Complete Profile
            </button>
            <button
              className="w-btn w-btn-outline"
              onClick={onClose}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Cancel
            </button>
          </div>
        </div>

        <style>{`
          .form-section {
            background: rgba(0,0,0,0.2);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border);
          }
          .form-section select,
          .form-section input[type="text"],
          .form-section input[type="number"] {
            width: 100%;
            padding: 12px 14px;
            border-radius: 8px;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            color: var(--text-main);
            font-family: inherit;
            font-size: 14px;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
          }
          .form-section select {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
            cursor: pointer;
          }
          .form-section select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .form-section select option {
            background: var(--bg-darker);
            color: var(--text-main);
            padding: 10px;
          }
          .form-section input::placeholder,
          .form-section select:invalid {
            color: var(--text-muted);
          }
          input[type="file"]::file-selector-button {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}
