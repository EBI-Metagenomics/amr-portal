/// <reference types="vite/client" />

/** Declares `import.meta.env` keys used in `src/config/appEnv.ts` (build-time). */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PORTAL_PREFIX?: string;
  readonly VITE_APP_BASE?: string;
  readonly VITE_ENABLE_GENOME_VIEWER?: string;
  readonly VITE_GENOME_FASTA_BASE_URL?: string;
  readonly VITE_GENOME_GFF_BASE_URL?: string;
}
