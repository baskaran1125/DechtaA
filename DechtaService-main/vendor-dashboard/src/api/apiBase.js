const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const toApiBase = (value = '') => {
  const normalized = trimTrailingSlash(value);
  if (!normalized) return '/api';
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export const resolveVendorApiBase = () => {
  const explicitBase =
    import.meta.env.VITE_VENDOR_DEV_API_URL ||
    import.meta.env.VITE_VENDOR_API_URL ||
    import.meta.env.VITE_API_URL ||
    '';

  if (import.meta.env.DEV && !explicitBase) {
    return '/api';
  }

  return toApiBase(explicitBase);
};

export const VENDOR_API_BASE = resolveVendorApiBase();
