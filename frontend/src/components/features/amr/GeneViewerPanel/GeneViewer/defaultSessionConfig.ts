/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/defaultSessionConfig.ts`.
 * AMR extends METT with optional focused regions + bpPerPx (genotype rows).
 */

import { JBROWSE_TRACK_HEIGHTS, ZOOM_LEVELS } from '@utils/jbrowse/constants';
import type { GenomeMeta } from './assembly';

type AssemblyConfig = {
  sequence: { trackId: string; type: string };
};

export type DisplayedRegionInput = {
  refName: string;
  start: number;
  end: number;
  reversed?: boolean;
  assemblyName: string;
};

const getDefaultSessionConfig = (
  genomeMeta: GenomeMeta | null,
  assembly: AssemblyConfig | null,
  tracks: Array<Record<string, unknown>>,
  options?: {
    displayedRegions?: DisplayedRegionInput[];
    bpPerPx?: number;
  }
) => {
  if (!genomeMeta || !assembly) {
    return null;
  }

  const displayedRegions =
    options?.displayedRegions ??
    genomeMeta.contigs.map(contig => ({
      refName: contig.name,
      start: 0,
      end: contig.length,
      reversed: false,
      assemblyName: genomeMeta.assembly_name,
    }));

  const bpPerPx = options?.bpPerPx ?? ZOOM_LEVELS.BP_PER_PX;

  return {
    name: 'Gene Viewer Session',
    configuration: {
      header: {
        disable: true,
        hidden: true,
      },
    },
    margin: 0,
    widgets: {
      BaseFeatureWidget: {
        type: 'BaseFeatureWidget',
        disabled: true,
      },
    },
    views: [
      {
        id: 'linearGenomeView',
        minimized: false,
        type: 'LinearGenomeView',
        hideHeader: true,
        configuration: {
          header: {
            hidden: true,
            disable: true,
          },
          onFeatureClick: null,
        },
        hideTrackSelector: true,
        hideVerticalResizeHandle: true,
        displayedRegions,
        tracks: [
          {
            id: assembly.sequence.trackId,
            type: assembly.sequence.type,
            configuration: 'reference',
            minimized: false,
            height: JBROWSE_TRACK_HEIGHTS.REFERENCE_SEQUENCE,
            displays: [
              {
                id: assembly.sequence.trackId,
                type: 'LinearReferenceSequenceDisplay',
                height: JBROWSE_TRACK_HEIGHTS.REFERENCE_SEQUENCE,
                showForward: true,
                showReverse: true,
                showLabels: true,
                showTranslation: false,
                showForwardStrand: true,
                showReverseStrand: false,
              },
            ],
          },
          ...tracks.map(track => ({
            id: track.trackId,
            type: track.type,
            configuration: track.trackId,
            minimized: false,
            visible: true,
            displays: track.displays,
          })),
        ],
        hideHeaderOverview: true,
        hideNoTracksActive: false,
        trackSelectorType: 'hierarchical',
        trackLabels: 'offset',
        showCenterLine: false,
        showCytobandsSetting: true,
        showGridlines: true,
        scale: 1,
        bpPerPx,
        offsetPx: 0,
      },
    ],
  };
};

export default getDefaultSessionConfig;

export function bpPerPxForGenotypeFocus(start: number, end: number): number {
  const span = Math.max(1, end - start);
  const raw = span / ZOOM_LEVELS.GENOTYPE_FOCUS_VIEWPORT_BP;
  return Math.min(ZOOM_LEVELS.BP_PER_PX_MAX, Math.max(ZOOM_LEVELS.BP_PER_PX_MIN, raw));
}
