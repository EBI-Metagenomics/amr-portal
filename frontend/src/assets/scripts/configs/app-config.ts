type RuntimeConfig = {
  apiBaseUrl?: string;
};

const DEV_API_BASE_URL = 'http://localhost:8000/api';
const DEFAULT_API_BASE_URL = '/amr/api';

const getRuntimeConfig = (): RuntimeConfig | undefined => {
  const extendedWindow = window as Window & { __AMR_CONFIG__?: RuntimeConfig };
  return extendedWindow.__AMR_CONFIG__;
};

export const getApiBaseUrl = (): string => {
  const runtimeApiBaseUrl = getRuntimeConfig()?.apiBaseUrl;

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  if (window.location.hostname === 'localhost') {
    return DEV_API_BASE_URL;
  }

  return DEFAULT_API_BASE_URL;
};

/**
 * Build a full URL for an API path. Root-relative bases must use the browser origin
 * (not document.baseURI), which can reflect nginx internal ports or a base tag href.
 */
export const resolveApiUrl = (subPath: string): string => {
  const trimmed = subPath.replace(/^\//, '');
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/${trimmed}`;
  }
  const rootPrefix = base.startsWith('/') ? base : `/${base}`;
  return `${window.location.origin}${rootPrefix}/${trimmed}`;
};

export default {
  get apiBaseUrl() {
    return getApiBaseUrl();
  }
};