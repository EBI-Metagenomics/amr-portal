/**
 * Composes JBrowse assembly, tracks, and default session (same role as METT `geneViewerConfig.ts`).
 */

import { useMemo } from 'react';
import getAssembly from './assembly';
import type { GenomeMeta } from './assembly';
import getTracks from './tracks';
import getDefaultSessionConfig, { type DisplayedRegionInput } from './defaultSessionConfig';
import type { Track } from './geneViewerState';

export type { GenomeMeta, DisplayedRegionInput };

export const useAmrGeneViewerConfig = (
  genomeMeta: GenomeMeta | null,
  fastaUri: string | null,
  gffUri: string | null,
  sessionOptions?: {
    displayedRegions?: DisplayedRegionInput[];
    bpPerPx?: number;
  }
) => {
  const assembly = useMemo(() => {
    if (!genomeMeta || !fastaUri) return null;
    return getAssembly(genomeMeta, fastaUri);
  }, [genomeMeta, fastaUri]);

  const tracks = useMemo((): Track[] => {
    if (!genomeMeta || !gffUri) return [];
    return getTracks(genomeMeta.assembly_name, gffUri) as Track[];
  }, [genomeMeta, gffUri]);

  const sessionConfig = useMemo(() => {
    if (!genomeMeta || !assembly) return null;
    return getDefaultSessionConfig(genomeMeta, assembly, tracks, sessionOptions);
  }, [genomeMeta, assembly, tracks, sessionOptions]);

  return {
    assembly,
    tracks,
    sessionConfig,
  };
};
