const defaultApiBaseUrl = '/amr/api';
const runtimeApiBaseUrlPlaceholder = 'VITE_API_BASE_URL_PLACEHOLDER';

/** Set by container startup (`runtime-config.js`) so NodePort / absolute API URLs work without sed on bundles. */
function readRuntimeApiBaseFromWindow(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & { __AMR_API_BASE_URL__?: string };
  const v = w.__AMR_API_BASE_URL__;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Public path prefix for the marketing site (same host as the SPA). */
export const PORTAL_PREFIX = (import.meta.env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '');

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export const API_BASE_URL =
  readRuntimeApiBaseFromWindow() ??
  (configuredApiBaseUrl && configuredApiBaseUrl !== runtimeApiBaseUrlPlaceholder
    ? configuredApiBaseUrl
    : window.location.hostname === 'localhost'
      ? 'http://localhost:8000/api'
      : defaultApiBaseUrl);

export const FTP_DOWNLOAD_URL = 'https://ftp.ebi.ac.uk/pub/databases/amr_portal';
