import type { AMRColumnMeta, AMRRecord, AMRRecordValue } from '@interfaces/amrRecord';

/** API view id: genotype (per README / filters). */
export const AMR_VIEW_ID_GENOTYPE = 2;

export type GenomeViewerViewMode = 'genotype' | 'phenotype';

export type GenomeViewerRowContext = {
  viewMode: GenomeViewerViewMode;
  assemblyId: string;
  /** 0-based half-open interval on `refName`, when zooming genotype rows. */
  focusedRegion?: { refName: string; start: number; end: number; reversed?: boolean };
  /** Locus tag for JBrowse highlight (`window.selectedGeneId`). */
  locusTag?: string;
};

const ASSEMBLY_KEYS = [
  'assembly_id',
  'Assembly_id',
  'genotype-assembly_id',
  'phenotype-assembly_id',
  'assembly',
];

const REGION_KEYS = ['region', 'Region', 'Contig_id', 'contig_id', 'genotype-region', 'contig'];

const START_KEYS = ['region_start', 'region start', 'start', 'gene_start', 'genotype-region_start'];

const END_KEYS = ['region_end', 'region end', 'end', 'gene_end', 'genotype-region_end'];

const STRAND_KEYS = ['strand', 'Strand'];

const LOCUS_KEYS = ['id', 'locus_tag', 'Locus_tag', 'genotype-id', 'locus'];

function getMappedValue(record: AMRRecord, columns: AMRColumnMeta[], keys: string[]): AMRRecordValue | undefined {
  const byId = new Map(columns.map(c => [c.id, c] as const));
  for (const k of keys) {
    if (byId.has(k)) {
      const v = record[k];
      if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) return v;
    }
  }
  const lowerKeys = new Set(keys.map(k => k.toLowerCase()));
  for (const col of columns) {
    if (lowerKeys.has(col.id.toLowerCase())) {
      const v = record[col.id];
      if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) return v;
    }
  }
  return undefined;
}

function asTrimmedString(v: AMRRecordValue | undefined): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) {
    const first = v[0];
    if (first === undefined || first === null) return null;
    const s = String(first).trim();
    return s || null;
  }
  const s = String(v).trim();
  return s || null;
}

function asPositiveInt(v: AMRRecordValue | undefined): number | null {
  const s = asTrimmedString(v);
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Interpret 1-based closed coordinates from the API as JBrowse 0-based half-open [start, end).
 */
function toJBrowseInterval(oneBasedStart: number, oneBasedEnd: number): { start: number; end: number } | null {
  if (oneBasedEnd < oneBasedStart) return null;
  return { start: oneBasedStart - 1, end: oneBasedEnd };
}

export function buildGenomeViewerRowContext(
  record: AMRRecord,
  columns: AMRColumnMeta[],
  currentViewId: number
): GenomeViewerRowContext | null {
  const assemblyId = asTrimmedString(getMappedValue(record, columns, ASSEMBLY_KEYS));
  if (!assemblyId) return null;

  const isGenotype = currentViewId === AMR_VIEW_ID_GENOTYPE;

  if (!isGenotype) {
    return { viewMode: 'phenotype', assemblyId };
  }

  const refName = asTrimmedString(getMappedValue(record, columns, REGION_KEYS));
  const rs = asPositiveInt(getMappedValue(record, columns, START_KEYS));
  const re = asPositiveInt(getMappedValue(record, columns, END_KEYS));
  const strandRaw = asTrimmedString(getMappedValue(record, columns, STRAND_KEYS));
  const reversed = strandRaw === '-' || strandRaw === '-1' || strandRaw === '−';
  const locusTag = asTrimmedString(getMappedValue(record, columns, LOCUS_KEYS)) ?? undefined;

  let focusedRegion: GenomeViewerRowContext['focusedRegion'];
  if (refName && rs !== null && re !== null) {
    const interval = toJBrowseInterval(rs, re);
    if (interval) {
      focusedRegion = { refName, ...interval, reversed };
    }
  }

  return {
    viewMode: 'genotype',
    assemblyId,
    focusedRegion,
    locusTag,
  };
}
