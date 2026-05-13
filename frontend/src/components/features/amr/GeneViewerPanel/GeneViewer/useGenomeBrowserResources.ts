import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGenomeFastaBaseUrl, getGenomeGffBaseUrl } from '@/config/appEnv';
import type { GenomeViewerRowContext } from '@utils/genomeViewer/recordContext';
import { buildGenomeAssemblyDirectoryUrl, buildGenomeGffUri } from './assemblyPaths';
import { bpPerPxForGenotypeFocus, type DisplayedRegionInput } from './defaultSessionConfig';
import type { GenomeMeta } from './assembly';

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
    };

function clampDisplayedRegion(
  fr: GenomeViewerRowContext['focusedRegion'],
  seqLen: number
): DisplayedRegionInput | null {
  if (!fr) return null;
  const start = Math.max(0, Math.min(fr.start, Math.max(0, seqLen - 1)));
  const end = Math.max(start + 1, Math.min(fr.end, seqLen));
  return {
    refName: fr.refName,
    start,
    end,
    reversed: fr.reversed,
    assemblyName: '',
  };
}

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

  const fastaAssemblyDirectoryUrl = useMemo(() => {
    if (!fastaBaseUrl || !rowContext?.assemblyId) return null;
    return buildGenomeAssemblyDirectoryUrl(fastaBaseUrl, rowContext.assemblyId);
  }, [fastaBaseUrl, rowContext]);

  const gffAssemblyDirectoryUrl = useMemo(() => {
    if (!gffBaseUrl || !rowContext?.assemblyId) return null;
    return buildGenomeAssemblyDirectoryUrl(gffBaseUrl, rowContext.assemblyId);
  }, [gffBaseUrl, rowContext]);

  const assemblyId = rowContext?.assemblyId ?? null;
  const faiUrl =
    fastaAssemblyDirectoryUrl && assemblyId
      ? `${fastaAssemblyDirectoryUrl.replace(/\/$/, '')}/${assemblyId}.fa.gz.fai`
      : null;

  const genotypeNeedsCoords = rowContext?.viewMode === 'genotype' && !rowContext.focusedRegion;

  const faiQuery = useQuery({
    queryKey: ['genome-fai', faiUrl],
    queryFn: async () => {
      if (!faiUrl) throw new Error('FAI URL missing');
      return fetchFaiSequences(faiUrl);
    },
    enabled: Boolean(
      loadData && hasSelectedTableRow && rowContext && fastaAssemblyDirectoryUrl && faiUrl && !genotypeNeedsCoords
    ),
  });

  const sessionPlan = useMemo((): GenomeSessionPlan | null => {
    if (!rowContext || !fastaAssemblyDirectoryUrl || !gffAssemblyDirectoryUrl || !assemblyId) return null;

    if (rowContext.viewMode === 'genotype' && !rowContext.focusedRegion) {
      return { kind: 'invalid', code: 'genotype_missing_region' };
    }

    if (!faiQuery.data?.length) return null;

    const contigs = faiQuery.data.map(s => ({ name: s.name, length: s.length }));
    const gffUri = buildGenomeGffUri(gffAssemblyDirectoryUrl, assemblyId);

    let displayedRegions: DisplayedRegionInput[] | undefined;
    let bpPerPx: number | undefined;

    if (rowContext.viewMode === 'genotype') {
      const seq = findFaiEntry(faiQuery.data, rowContext.focusedRegion!.refName);
      if (!seq) return { kind: 'invalid', code: 'genotype_unknown_contig' };
      const clamped = clampDisplayedRegion(rowContext.focusedRegion, seq.length);
      if (!clamped) return { kind: 'invalid', code: 'genotype_bad_interval' };
      displayedRegions = [{ ...clamped, assemblyName: assemblyId, refName: seq.name }];
      bpPerPx = bpPerPxForGenotypeFocus(clamped.start, clamped.end);
    }

    return {
      kind: 'ready',
      genomeMeta: { assembly_name: assemblyId, contigs },
      gffUri,
      displayedRegions,
      bpPerPx,
    };
  }, [rowContext, fastaAssemblyDirectoryUrl, gffAssemblyDirectoryUrl, assemblyId, faiQuery.data]);

  const sessionOptions = useMemo(() => {
    if (sessionPlan?.kind !== 'ready') return undefined;
    return {
      displayedRegions: sessionPlan.displayedRegions,
      bpPerPx: sessionPlan.bpPerPx,
    };
  }, [sessionPlan]);

  const genomeMeta = sessionPlan?.kind === 'ready' ? sessionPlan.genomeMeta : null;
  const gffUriReady = sessionPlan?.kind === 'ready' ? sessionPlan.gffUri : null;

  const initKey = useMemo(() => {
    const parts = [
      assemblyId ?? '',
      fastaAssemblyDirectoryUrl ?? '',
      gffAssemblyDirectoryUrl ?? '',
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
    fastaAssemblyDirectoryUrl,
    gffAssemblyDirectoryUrl,
    rowContext?.viewMode,
    rowContext?.focusedRegion,
    rowContext?.locusTag,
    faiQuery.dataUpdatedAt,
  ]);

  return {
    fastaBaseUrl,
    gffBaseUrl,
    fastaAssemblyDirectoryUrl,
    gffAssemblyDirectoryUrl,
    assemblyId,
    faiUrl,
    faiQuery,
    sessionPlan,
    genomeMeta,
    gffUriReady,
    sessionOptions,
    initKey,
  };
}
