const KEY = 'dechta_kyc_profile';

export const STATUS = {
  DRAFT: 'DRAFT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const DEFAULT = {
  profileDetails: {},
  companyDetails: {},
  bankDetails: {},
  documents: {},
  profileImage: null,
  verificationStatus: STATUS.DRAFT,
  submittedAt: null,
};

const textOrNull = (value) => {
  const text = String(value ?? '').trim();
  return text ? text : null;
};

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
};

export const normalizeVerificationStatus = (rawStatus) => {
  const raw = String(rawStatus || '').trim().toLowerCase();
  if (!raw) return STATUS.DRAFT;

  if (['verified', 'approved', 'completed'].includes(raw)) {
    return STATUS.APPROVED;
  }
  if (['rejected', 'declined', 'suspended', 'banned'].includes(raw)) {
    return STATUS.REJECTED;
  }
  if (['pending', 'pending_verification', 'under_review', 'submitted'].includes(raw)) {
    return STATUS.PENDING_VERIFICATION;
  }
  return STATUS.DRAFT;
};

export const toBackendVerificationStatus = (status) => {
  if (status === STATUS.APPROVED) return 'verified';
  if (status === STATUS.REJECTED) return 'rejected';
  if (status === STATUS.PENDING_VERIFICATION) return 'pending';
  return 'pending';
};

const normalizeKeyPart = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

const resolveStorageKey = (vendor) => {
  const vendorId = normalizeKeyPart(vendor?.id);
  if (vendorId) return `${KEY}:${vendorId}`;
  const userId = normalizeKeyPart(vendor?.userId || vendor?.user_id);
  if (userId) return `${KEY}:u-${userId}`;
  const mobile = normalizeKeyPart(vendor?.mobile || vendor?.phone);
  if (mobile) return `${KEY}:m-${mobile}`;
  return null;
};

export const loadKYC = (vendor) => {
  const scopedKey = resolveStorageKey(vendor);
  if (!scopedKey) return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(scopedKey);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };

    return { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
};

export const saveKYC = (data, vendor) => {
  const scopedKey = resolveStorageKey(vendor);
  if (!scopedKey) return data;
  localStorage.setItem(scopedKey, JSON.stringify(data));
  return data;
};

export const submitForVerification = (data, vendor) => {
  const updated = {
    ...data,
    verificationStatus: STATUS.PENDING_VERIFICATION,
    submittedAt: new Date().toISOString(),
  };
  return saveKYC(updated, vendor);
};

export const buildKycFromVendor = (vendor, seed) => {
  const base = {
    ...DEFAULT,
    ...(seed || {}),
    profileDetails: { ...(seed?.profileDetails || {}) },
    companyDetails: { ...(seed?.companyDetails || {}) },
    bankDetails: { ...(seed?.bankDetails || {}) },
    documents: { ...(seed?.documents || {}) },
  };

  const backendStatus = normalizeVerificationStatus(vendor?.verificationStatus || vendor?.verification_status);
  const verificationStatus = backendStatus === STATUS.DRAFT ? STATUS.DRAFT : backendStatus;

  return {
    ...base,
    verificationStatus,
    profileDetails: {
      ...base.profileDetails,
      name: firstNonEmpty(base.profileDetails?.name, vendor?.ownerName) || '',
      location: firstNonEmpty(
        base.profileDetails?.location,
        vendor?.locationLabel,
        vendor?.address
      ) || '',
      area: firstNonEmpty(base.profileDetails?.area, vendor?.area) || '',
      latitude: numberOrNull(base.profileDetails?.latitude) ?? numberOrNull(vendor?.latitude),
      longitude: numberOrNull(base.profileDetails?.longitude) ?? numberOrNull(vendor?.longitude),
    },
    companyDetails: {
      ...base.companyDetails,
      companyName: firstNonEmpty(base.companyDetails?.companyName, vendor?.shopName) || '',
      gst: firstNonEmpty(base.companyDetails?.gst, vendor?.gstNumber) || '',
      email: firstNonEmpty(base.companyDetails?.email, vendor?.email) || '',
      locationLabel: firstNonEmpty(base.companyDetails?.locationLabel, vendor?.locationLabel) || '',
      latitude: numberOrNull(base.companyDetails?.latitude) ?? numberOrNull(vendor?.latitude),
      longitude: numberOrNull(base.companyDetails?.longitude) ?? numberOrNull(vendor?.longitude),
    },
    bankDetails: {
      ...base.bankDetails,
      bankName: firstNonEmpty(base.bankDetails?.bankName, vendor?.bankName) || '',
      accountNo: firstNonEmpty(base.bankDetails?.accountNo, vendor?.bankAccount) || '',
      ifsc: firstNonEmpty(base.bankDetails?.ifsc, vendor?.ifsc) || '',
    },
  };
};

export const buildVendorUpdatePayload = (kyc, vendor, options = {}) => {
  const profileDetails = { ...(kyc?.profileDetails || {}) };
  const companyDetails = { ...(kyc?.companyDetails || {}) };
  const bankDetails = { ...(kyc?.bankDetails || {}) };
  const documents = { ...(kyc?.documents || {}) };
  const primaryAddress = Array.isArray(profileDetails.addresses) ? profileDetails.addresses[0] : null;

  const resolvedLatitude = numberOrNull(
    profileDetails.latitude ??
    profileDetails.lat ??
    primaryAddress?.lat ??
    companyDetails.latitude ??
    companyDetails.lat ??
    vendor?.latitude
  );

  const resolvedLongitude = numberOrNull(
    profileDetails.longitude ??
    profileDetails.lng ??
    primaryAddress?.lng ??
    companyDetails.longitude ??
    companyDetails.lng ??
    vendor?.longitude
  );

  const resolvedAddress = textOrNull(
    profileDetails.address ||
    primaryAddress?.text ||
    primaryAddress?.line1 ||
    profileDetails.location ||
    profileDetails.landmark ||
    vendor?.address
  );

  return {
    shopName: firstNonEmpty(companyDetails.companyName, vendor?.shopName),
    ownerName: firstNonEmpty(profileDetails.name, vendor?.ownerName),
    address: resolvedAddress,
    gstNumber: firstNonEmpty(companyDetails.gst, vendor?.gstNumber),
    email: firstNonEmpty(companyDetails.email, vendor?.email),
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
    locationLabel: firstNonEmpty(
      profileDetails.locationLabel,
      companyDetails.locationLabel,
      profileDetails.location,
      vendor?.locationLabel
    ),
    profileDetails,
    companyDetails,
    bankDetails,
    documents,
    submittedForVerification: !!options.submittedForVerification,
  };
};

export const validate = {
  aadhaar: (v) => /^\d{12}$/.test((v || '').replace(/\s/g, '')),
  pan: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((v || '').toUpperCase()),
  gst: (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test((v || '').toUpperCase()),
  ifsc: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test((v || '').toUpperCase()),
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
};
