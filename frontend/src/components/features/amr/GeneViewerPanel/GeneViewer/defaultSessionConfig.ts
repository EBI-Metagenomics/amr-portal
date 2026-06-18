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

export type SessionViewOptions = {
  displayedRegions?: DisplayedRegionInput[];
  bpPerPx?: number;
  offsetPx?: number;
};

const getDefaultSessionConfig = (
  genomeMeta: GenomeMeta | null,
  assembly: AssemblyConfig | null,
  tracks: Array<Record<string, unknown>>,
  options?: SessionViewOptions
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
  const offsetPx = options?.offsetPx ?? 0;

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
          ...tracks.map(track => {
            const trackDisplays = Array.isArray(track.displays) ? track.displays : [];
            const display = trackDisplays[0] as
              | { displayId?: string; type?: string; height?: number }
              | undefined;
            return {
              id: track.trackId,
              type: track.type,
              configuration: track.trackId,
              minimized: false,
              visible: true,
              displays: display?.displayId
                ? [
                    {
                      type: display.type ?? 'LinearBasicDisplay',
                      configuration: display.displayId,
                      height: display.height,
                    },
                  ]
                : [],
            };
          }),
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
        offsetPx,
      },
    ],
  };
};

export default getDefaultSessionConfig;

export type GenotypeViewport = { bpPerPx: number; offsetPx: number };

function clampGenotypeBpPerPx(raw: number): number {
  return Math.min(
    ZOOM_LEVELS.GENOTYPE_BP_PER_PX_MAX,
    Math.max(ZOOM_LEVELS.BP_PER_PX_MIN, raw)
  );
}

/** Initial zoom + scroll position for a genotype row: gene-centered with neighboring context. */
export function getGenotypeViewport(start: number, end: number, contigLength: number): GenotypeViewport {
  const geneSpan = Math.max(1, end - start);
  const contigSpan = Math.max(1, contigLength);
  let targetViewportBp = Math.min(
    Math.max(geneSpan * ZOOM_LEVELS.GENOTYPE_NEIGHBOR_PADDING, ZOOM_LEVELS.GENOTYPE_MIN_VIEWPORT_BP),
    ZOOM_LEVELS.GENOTYPE_MAX_VIEWPORT_BP,
    contigSpan
  );
  const bpPerPx = clampGenotypeBpPerPx(targetViewportBp / ZOOM_LEVELS.VIEWPORT_WIDTH_PX);
  const visibleBp = ZOOM_LEVELS.VIEWPORT_WIDTH_PX * bpPerPx;

  // Entire contig fits — fill the panel width and align to the start (no empty grey tail).
  if (contigSpan <= visibleBp) {
    return { bpPerPx, offsetPx: 0 };
  }

  const centerBp = Math.max(0, (start + end) / 2);
  const maxOffsetPx = Math.max(0, contigSpan / bpPerPx - ZOOM_LEVELS.VIEWPORT_WIDTH_PX);
  const centeredOffset = centerBp / bpPerPx - ZOOM_LEVELS.VIEWPORT_WIDTH_PX / 2;
  const offsetPx = Math.min(maxOffsetPx, Math.max(0, centeredOffset));
  return { bpPerPx, offsetPx };
}
