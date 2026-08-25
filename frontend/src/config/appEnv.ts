/**
 * Single module for app configuration from `import.meta.env` (`VITE_*` at build)
 * and `runtime-config.js` (`window.__AMR_*` at container start from pod env).
 */

const apiBasePlaceholder = 'VITE_API_BASE_URL_PLACEHOLDER';
const fastaBasePlaceholder = 'VITE_GENOME_FASTA_BASE_URL_PLACEHOLDER';
const gffBasePlaceholder = 'VITE_GENOME_GFF_BASE_URL_PLACEHOLDER';

const defaultApiBaseUrl = '/amr/api';

type AmrRuntimeInjected = {
  __AMR_API_BASE_URL__?: string;
  __AMR_ENABLE_GENOME_VIEWER__?: string;
  __AMR_GENOME_FASTA_BASE_URL__?: string;
  __AMR_GENOME_GFF_BASE_URL__?: string;
  __AMR_MATOMO_ENABLED__?: string;
  __AMR_MATOMO_URL__?: string;
  __AMR_MATOMO_SITE_ID__?: string;
  __AMR_MATOMO_SCRIPT_URL__?: string;
};

const DEFAULT_MATOMO_URL = 'https://ebi-mgnify.matomo.cloud';
const DEFAULT_MATOMO_SITE_ID = '11';
const DEFAULT_MATOMO_SCRIPT_URL =
  'https://cdn.matomo.cloud/ebi-mgnify.matomo.cloud/matomo.js';

function readTruthyFlag(injected: string | undefined, fromEnv: string | undefined): boolean {
  if (injected === 'false' || injected === '0') return false;
  if (injected === 'true' || injected === '1') return true;
  return fromEnv === 'true' || fromEnv === '1';
}

function readOptionalString(injected: string | undefined, fromEnv: string | undefined): string | null {
  const value =
    (typeof injected === 'string' && injected.length > 0 ? injected : undefined) ??
    (typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : undefined);
  if (!value) return null;
  return value.trim();
}

function readRuntime(): AmrRuntimeInjected {
  if (typeof window === 'undefined') return {};
  return window as Window & AmrRuntimeInjected;
}

function pickConfiguredString(
  injected: string | undefined,
  fromEnv: string | undefined,
  placeholder: string
): string | null {
  const configured =
    (typeof injected === 'string' && injected.length > 0 ? injected : undefined) ??
    (fromEnv && fromEnv !== placeholder ? fromEnv : '');
  const trimmed = configured.replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

/** Public path prefix for the marketing site (same host as the SPA). */
export const PORTAL_PREFIX = (import.meta.env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '');

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

/** Backend API base URL for browser `fetch` / axios. */
export const API_BASE_URL =
  readRuntime().__AMR_API_BASE_URL__ ??
  (configuredApiBaseUrl && configuredApiBaseUrl !== apiBasePlaceholder
    ? configuredApiBaseUrl
    : typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000/api'
      : defaultApiBaseUrl);

/** Genome viewer strip is off unless explicitly enabled (parallel releases). */
export function isGenomeViewerEnabled(): boolean {
  const injected = readRuntime().__AMR_ENABLE_GENOME_VIEWER__;
  if (injected === 'false' || injected === '0') return false;
  if (injected === 'true' || injected === '1') return true;
  const v = import.meta.env.VITE_ENABLE_GENOME_VIEWER;
  return v === 'true' || v === '1';
}

/** Root URL for bgzip FASTA + `.fai` / `.gzi` (see `GeneViewer/assemblyPaths.ts` for the assembly_id layout). */
export function getGenomeFastaBaseUrl(): string | null {
  return pickConfiguredString(
    readRuntime().__AMR_GENOME_FASTA_BASE_URL__,
    import.meta.env.VITE_GENOME_FASTA_BASE_URL,
    fastaBasePlaceholder
  );
}

/** Root URL for bgzip GFF + `.tbi` (same assembly_id subpath layout as FASTA; may differ). */
export function getGenomeGffBaseUrl(): string | null {
  return pickConfiguredString(
    readRuntime().__AMR_GENOME_GFF_BASE_URL__,
    import.meta.env.VITE_GENOME_GFF_BASE_URL,
    gffBasePlaceholder
  );
}

export type MatomoConfig = {
  enabled: boolean;
  url: string;
  siteId: string;
  scriptUrl: string;
};

/** Matomo is off unless explicitly enabled; URL/site ID fall back to the MGnify cloud defaults. */
export function getMatomoConfig(): MatomoConfig {
  const runtime = readRuntime();
  const enabled = readTruthyFlag(runtime.__AMR_MATOMO_ENABLED__, import.meta.env.VITE_MATOMO_ENABLED);
  const urlRaw =
    readOptionalString(runtime.__AMR_MATOMO_URL__, import.meta.env.VITE_MATOMO_URL) ??
    DEFAULT_MATOMO_URL;
  const url = urlRaw.replace(/\/$/, '');
  const siteId =
    readOptionalString(runtime.__AMR_MATOMO_SITE_ID__, import.meta.env.VITE_MATOMO_SITE_ID) ??
    DEFAULT_MATOMO_SITE_ID;
  const scriptUrl =
    readOptionalString(runtime.__AMR_MATOMO_SCRIPT_URL__, import.meta.env.VITE_MATOMO_SCRIPT_URL) ??
    DEFAULT_MATOMO_SCRIPT_URL;

  return { enabled, url, siteId, scriptUrl };
}

export function isMatomoEnabled(): boolean {
  const { enabled, url, siteId } = getMatomoConfig();
  return enabled && url.length > 0 && siteId.length > 0;
}
