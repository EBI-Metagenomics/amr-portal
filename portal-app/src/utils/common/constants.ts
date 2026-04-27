const defaultApiBaseUrl = '/amr/api';

/** Public path prefix for the marketing site (same host as the SPA). */
export const PORTAL_PREFIX = (import.meta.env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '');

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : defaultApiBaseUrl);

export const FTP_DOWNLOAD_URL = 'https://ftp.ebi.ac.uk/pub/databases/amr_portal';
