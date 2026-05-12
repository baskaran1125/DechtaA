export interface BankDetails {
  name: string;
  branch: string;
  account: string;
  ifsc: string;
  passbookFile: File | null;
  status: 'missing' | 'pending' | 'verified';
}

export interface UserLocation {
  state: string;
  city: string;
  area: string;
  address: string;
}

export interface UserData {
  id: string;
  name: string;
  phone: string;
  photoFile: File | null;
  qualification: string;
  location: UserLocation;
  isProfileComplete: boolean;
  isApproved: boolean;
  isDocumentsSubmitted: boolean;
  selectedSkills: string[];
  selectedCategory: string;
  idProofFile: File | null;
  idProofType: string;
  aadharNumber: string;
  aadharFile: File | null;
  panNumber: string;
  panFile: File | null;
  referralCode: string;
  signupReferralCode: string | null;
  bankDetails: BankDetails;
  hasBankDetails: boolean;
}

export interface WalletState {
  gross: number;
  fees: number;
  net: number;
}

export interface Transaction {
  jobId: string;
  service: string;
  date: string;
  amount: number;
  transactionType: 'credit' | 'debit';
}

export interface Withdrawal {
  date: string;
  refId: string;
  amount: number;
}

export interface IncomingJob {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  skillType: string;
  address: string;
  area: string;
  distance: string;
  estimatedPay: number;
  description: string;
  voiceNote?: string; // URL to the voice recording from customer
}

export interface PendingJobSession {
  jobDetails: IncomingJob;
  elapsedSeconds: number; // Time already worked
  pausedAt: string; // ISO timestamp when paused
  acceptedAt: string; // ISO timestamp when originally accepted
  jobStatus: 'pending' | 'active' | 'completed';
}

export interface WorkerState {
  isLoggedIn: boolean;
  isActive: boolean;
  language: 'en' | 'hi' | 'ta';
  isVoiceEnabled: boolean;
  otpMode: 'START' | 'END';
  isPremium: boolean;
  weeklyHours: number;
  weeklyEarnings: number;
  weekStartDate: string | null;
  premiumRules: { requiredHours: number; priorityWindow: number };
  user: UserData;
  wallet: WalletState;
  jobsDone: number;
  totalJobsReceived: number;
  rating: number;
  reviews: number;
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  hasActiveJob: boolean;
  jobArrived: boolean;
  activeJobStartTime: number;
  isFrozen: boolean;
  theme: 'dark' | 'light';
  isFlipped: boolean;
  declinedCount: number;
  isSuspended: boolean;
  suspensionEndTime: number;
  loginStartTime: number;
  onlineStartTime: number | null;
  todayOnlineSeconds: number;
  lastOnlineDate: string | null;
  activeSection: string;
  incomingJob: IncomingJob | null;
  currentJobDetails: IncomingJob | null;
  pendingJobs: PendingJobSession[]; // Paused jobs awaiting resume
  currentSessionElapsedTime: number; // Saved elapsed seconds if resuming a job
}
