import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGenomeFastaBaseUrl, getGenomeGffBaseUrl } from '@/config/appEnv';
import type { GenomeViewerRowContext } from '@utils/genomeViewer/recordContext';
import { buildGenomeAssemblyDirectoryUrl, buildGenomeGffUri } from './assemblyPaths';
import { getGenotypeViewport, type DisplayedRegionInput } from './defaultSessionConfig';
import type { GenomeMeta } from './assembly';

function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  return `${base}/${normalizedPath}`;
}

// TODO(amr): REMOVE after local rendering check with the sample files in `frontend/public/`.
const TEMP_TEST_FILE_OVERRIDE = {
  enabled: false,
  fastaUri: publicAssetUrl('/fasta/ABC/000/ABC_0008492/BU_ATCC8492VPI0062_NT5002.1.fa.gz'),
  gffUri: publicAssetUrl('/gff/ABC/000/ABC_0008492/BU_ATCC8492_annotations.gff.gz'),
} as const;

type FaiSequence = { name: string; length: number };

function parseFaiText(text: string): FaiSequence[] {
  const out: FaiSequence[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 2) continue;
    const name = cols[0].trim();
    const length = Number.parseInt(cols[1], 10);
    if (!name || !Number.isFinite(length) || length <= 0) continue;
    out.push({ name, length });
  }
  return out;
}

async function fetchFaiSequences(faiUrl: string): Promise<FaiSequence[]> {
  const response = await fetch(faiUrl);
  if (!response.ok) {
    throw new Error(`FAI request failed (${response.status}): ${faiUrl}`);
  }
  return parseFaiText(await response.text());
}

function findFaiEntry(fai: FaiSequence[], refName: string): FaiSequence | null {
  const direct = fai.find(s => s.name === refName);
  if (direct) return direct;
  const trimmed = refName.trim();
  return fai.find(s => trimmed.endsWith(s.name) || s.name.endsWith(trimmed)) ?? null;
}

type GenomeSessionPlan =
  | { kind: 'invalid'; code: 'genotype_missing_region' | 'genotype_unknown_contig' | 'genotype_bad_interval' }
  | {
      kind: 'ready';
      genomeMeta: GenomeMeta;
      gffUri: string;
      displayedRegions?: DisplayedRegionInput[];
      bpPerPx?: number;
      offsetPx?: number;
    };

/**
 * FAI-backed contig list + session plan for the genome browser (keeps `GeneViewerPanel` thin for review).
 * METT supplies `contigs` from API `GenomeMeta`; AMR loads the public `.fa.gz.fai` until the same exists server-side.
 */
export function useGenomeBrowserResources(
  loadData: boolean,
  hasSelectedTableRow: boolean,
  rowContext: GenomeViewerRowContext | null
) {
  const fastaBaseUrl = getGenomeFastaBaseUrl();
  const gffBaseUrl = getGenomeGffBaseUrl();
  const isUsingTempTestFiles = TEMP_TEST_FILE_OVERRIDE.enabled;
  const baseUrlConfigError =
    isUsingTempTestFiles
      ? null
      : !fastaBaseUrl && !gffBaseUrl
        ? 'both'
        : !fastaBaseUrl
          ? 'fasta'
          : !gffBaseUrl
            ? 'gff'
            : null;

  const fastaAssemblyDirectoryUrl = useMemo(() => {
    if (!fastaBaseUrl || !rowContext?.assemblyId) return null;
    return buildGenomeAssemblyDirectoryUrl(fastaBaseUrl, rowContext.assemblyId);
  }, [fastaBaseUrl, rowContext]);

  const gffAssemblyDirectoryUrl = useMemo(() => {
    if (!gffBaseUrl || !rowContext?.assemblyId) return null;
    return buildGenomeAssemblyDirectoryUrl(gffBaseUrl, rowContext.assemblyId);
  }, [gffBaseUrl, rowContext]);

  const assemblyId = rowContext?.assemblyId ?? null;
  const fastaUri = isUsingTempTestFiles
    ? TEMP_TEST_FILE_OVERRIDE.fastaUri
    : fastaAssemblyDirectoryUrl && assemblyId
      ? `${fastaAssemblyDirectoryUrl.replace(/\/$/, '')}/${assemblyId}.fasta.gz`
      : null;
  const faiUrl = fastaUri ? `${fastaUri}.fai` : null;
  const gffUri = isUsingTempTestFiles
    ? TEMP_TEST_FILE_OVERRIDE.gffUri
    : gffAssemblyDirectoryUrl && assemblyId
      ? buildGenomeGffUri(gffAssemblyDirectoryUrl, assemblyId)
      : null;

  const genotypeNeedsCoords = rowContext?.viewMode === 'genotype' && !rowContext.focusedRegion;

  const faiQuery = useQuery({
    queryKey: ['genome-fai', faiUrl],
    queryFn: async () => {
      if (!faiUrl) throw new Error('FAI URL missing');
      return fetchFaiSequences(faiUrl);
    },
    enabled: Boolean(
      loadData && hasSelectedTableRow && rowContext && faiUrl && (isUsingTempTestFiles || !genotypeNeedsCoords)
    ),
  });

  const sessionPlan = useMemo((): GenomeSessionPlan | null => {
    if (!rowContext || !assemblyId || !fastaUri || !gffUri) return null;

    if (!isUsingTempTestFiles && rowContext.viewMode === 'genotype' && !rowContext.focusedRegion) {
      return { kind: 'invalid', code: 'genotype_missing_region' };
    }

    if (!faiQuery.data?.length) return null;

    const contigs = faiQuery.data.map(s => ({ name: s.name, length: s.length }));

    let displayedRegions: DisplayedRegionInput[] | undefined;
    let bpPerPx: number | undefined;
    let offsetPx: number | undefined;

    if (rowContext.viewMode === 'genotype') {
      const selectedRegion = rowContext.focusedRegion;
      const seq = findFaiEntry(faiQuery.data, selectedRegion!.refName);
      if (!seq) return { kind: 'invalid', code: 'genotype_unknown_contig' };
      const clampedStart = Math.max(0, Math.min(selectedRegion!.start, Math.max(0, seq.length - 1)));
      const clampedEnd = Math.max(clampedStart + 1, Math.min(selectedRegion!.end, seq.length));
      displayedRegions = [
        {
          refName: seq.name,
          start: 0,
          end: seq.length,
          // Keep coordinate axis in genomic forward direction (left -> right).
          // Gene strand is represented by feature orientation, not by flipping the whole view.
          reversed: false,
          assemblyName: assemblyId,
        },
      ];
      ({ bpPerPx, offsetPx } = getGenotypeViewport(clampedStart, clampedEnd));
    }

    return {
      kind: 'ready',
      genomeMeta: { assembly_name: assemblyId, contigs },
      gffUri,
      displayedRegions,
      bpPerPx,
      offsetPx,
    };
  }, [rowContext, assemblyId, fastaUri, gffUri, faiQuery.data, isUsingTempTestFiles]);

  const initKey = useMemo(() => {
    const parts = [
      assemblyId ?? '',
      fastaUri ?? '',
      gffUri ?? '',
      rowContext?.viewMode ?? '',
      rowContext?.focusedRegion
        ? `${rowContext.focusedRegion.refName}:${rowContext.focusedRegion.start}-${rowContext.focusedRegion.end}:${rowContext.focusedRegion.reversed ? '1' : '0'}`
        : '',
      rowContext?.locusTag ?? '',
      String(faiQuery.dataUpdatedAt),
    ];
    return parts.join('|');
  }, [
    assemblyId,
    fastaUri,
    gffUri,
    rowContext,
    faiQuery.dataUpdatedAt,
  ]);

  return {
    baseUrlConfigError,
    isUsingTempTestFiles,
    fastaUri,
    gffUri,
    faiUrl,
    faiQuery,
    sessionPlan,
    initKey,
  };
}
