const defaultApiBaseUrl = '/amr/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : defaultApiBaseUrl);

export const FTP_DOWNLOAD_URL = 'https://ftp.ebi.ac.uk/pub/databases/amr_portal';
