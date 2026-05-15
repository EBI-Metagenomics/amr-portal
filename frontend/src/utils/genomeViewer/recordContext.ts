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

function hasUsableValue(v: AMRRecordValue | undefined): boolean {
  return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0);
}

function normalizeLookupKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

function getLookupVariants(value: string): string[] {
  const variants = new Set<string>();
  variants.add(normalizeLookupKey(value));

  const hyphenParts = value.split('-').filter(Boolean);
  for (let index = 1; index < hyphenParts.length; index += 1) {
    variants.add(normalizeLookupKey(hyphenParts.slice(index).join('-')));
  }

  return Array.from(variants);
}

function matchesLookupKey(value: string, normalizedKeys: Set<string>): boolean {
  return getLookupVariants(value).some(variant => normalizedKeys.has(variant));
}

function getMappedValue(record: AMRRecord, columns: AMRColumnMeta[], keys: string[]): AMRRecordValue | undefined {
  const byId = new Map(columns.map(c => [c.id, c] as const));
  for (const k of keys) {
    if (byId.has(k)) {
      const v = record[k];
      if (hasUsableValue(v)) return v;
    }
  }
  const normalizedKeys = new Set(keys.map(normalizeLookupKey));
  for (const col of columns) {
    if (matchesLookupKey(col.id, normalizedKeys)) {
      const v = record[col.id];
      if (hasUsableValue(v)) return v;
    }
  }
  for (const [recordKey, recordValue] of Object.entries(record)) {
    if (matchesLookupKey(recordKey, normalizedKeys) && hasUsableValue(recordValue)) {
      return recordValue;
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

  const refName = asTrimmedString(getMappedValue(record, columns, REGION_KEYS));
  const rs = asPositiveInt(getMappedValue(record, columns, START_KEYS));
  const re = asPositiveInt(getMappedValue(record, columns, END_KEYS));
  const strandRaw = asTrimmedString(getMappedValue(record, columns, STRAND_KEYS));
  const reversed = strandRaw === '-' || strandRaw === '-1' || strandRaw === '−';
  const locusTag = asTrimmedString(getMappedValue(record, columns, LOCUS_KEYS)) ?? undefined;

  const isGenotypeLike = currentViewId === AMR_VIEW_ID_GENOTYPE || (refName && rs !== null && re !== null);
  if (!isGenotypeLike) {
    return { viewMode: 'phenotype', assemblyId };
  }

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
