type RuntimeConfig = {
  apiBaseUrl?: string;
};

const DEV_API_BASE_URL = 'http://localhost:8000/api';
const DEFAULT_API_BASE_URL = '/amr/api';

const getRuntimeConfig = (): RuntimeConfig | undefined => {
  const extendedWindow = window as Window & { __AMR_CONFIG__?: RuntimeConfig };
  return extendedWindow.__AMR_CONFIG__;
};

const getApiBaseUrl = (): string => {
  const runtimeApiBaseUrl = getRuntimeConfig()?.apiBaseUrl;

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  if (window.location.hostname === 'localhost') {
    return DEV_API_BASE_URL;
  }

  return DEFAULT_API_BASE_URL;
};

export default {
  apiBaseUrl: getApiBaseUrl()
};