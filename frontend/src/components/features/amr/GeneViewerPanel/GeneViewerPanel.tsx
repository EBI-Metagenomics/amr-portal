import { useMemo } from 'react';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import GeneViewerContent from './GeneViewer/GeneViewerContent';
import useGeneViewerState from './GeneViewer/geneViewerState';
import { useAmrGeneViewerConfig } from './GeneViewer/geneViewerConfig';
import { useGenomeBrowserResources } from './GeneViewer/useGenomeBrowserResources';
import type { GenomeViewerRowContext } from '@utils/genomeViewer/recordContext';
import styles from './GeneViewerPanel.module.css';

type Props = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  rowContext: GenomeViewerRowContext | null;
  hasSelectedTableRow: boolean;
  loadData: boolean;
};

function formatSelectionSummary(rowContext: GenomeViewerRowContext | null): string | null {
  if (!rowContext) return null;
  if (rowContext.viewMode === 'phenotype') {
    return `Selected row: phenotype | assembly_id=${rowContext.assemblyId}`;
  }

  const focused = rowContext.focusedRegion
    ? `${rowContext.focusedRegion.refName}:${rowContext.focusedRegion.start + 1}-${rowContext.focusedRegion.end}${rowContext.focusedRegion.reversed ? ' (-)' : ''}`
    : 'no region coordinates';

  return `Selected row: genotype | assembly_id=${rowContext.assemblyId} | region=${focused}${rowContext.locusTag ? ` | locus=${rowContext.locusTag}` : ''}`;
}

const GeneViewerPanel = ({
  isCollapsed,
  onToggleCollapsed,
  rowContext,
  hasSelectedTableRow,
  loadData,
}: Props) => {
  const {
    baseUrlConfigError,
    isUsingTempTestFiles,
    fastaUri,
    gffUri,
    faiUrl,
    faiQuery,
    sessionPlan,
    initKey,
  } = useGenomeBrowserResources(loadData, hasSelectedTableRow, rowContext);

  const readySessionPlan = sessionPlan?.kind === 'ready' ? sessionPlan : null;
  const sessionOptions = useMemo(
    () =>
      readySessionPlan
        ? {
            displayedRegions: readySessionPlan.displayedRegions,
            bpPerPx: readySessionPlan.bpPerPx,
          }
        : undefined,
    [readySessionPlan]
  );

  const { assembly, tracks, sessionConfig } = useAmrGeneViewerConfig(
    readySessionPlan?.genomeMeta ?? null,
    fastaUri,
    readySessionPlan?.gffUri ?? gffUri ?? null,
    sessionOptions
  );

  const { viewState, initializationError } = useGeneViewerState(
    loadData ? (assembly as Record<string, unknown> | null) : null,
    loadData ? tracks : [],
    loadData ? (sessionConfig as Record<string, unknown> | null) : null,
    loadData ? initKey : 'idle'
  );

  const sectionClass = [panelStyles.root, styles.root, !isCollapsed ? styles.rootExpanded : '']
    .filter(Boolean)
    .join(' ');

  const sessionReady = sessionPlan?.kind === 'ready';
  const showBrowser =
    loadData &&
    hasSelectedTableRow &&
    Boolean(rowContext) &&
    Boolean(fastaUri) &&
    Boolean(gffUri) &&
    sessionReady &&
    !isCollapsed &&
    !faiQuery.isLoading &&
    !faiQuery.isError &&
    !initializationError;

  const highlightLocusId = showBrowser ? (rowContext?.locusTag ?? null) : null;
  const selectionSummary = formatSelectionSummary(rowContext);

  return (
    <section className={sectionClass} aria-label="Gene viewer panel">
      <div className={styles.toolbar}>
        <span className={styles.title}>Genome viewer (JBrowse 2)</span>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? 'Expand gene viewer panel' : 'Collapse gene viewer panel'}
        >
          {isCollapsed ? '▾' : '▴'}
        </button>
      </div>
      {!isCollapsed ? (
        <div className={styles.viewerBody}>
          {baseUrlConfigError ? (
            <p className={styles.error} role="alert">
              Genome file roots are not fully configured.
              {baseUrlConfigError === 'fasta' || baseUrlConfigError === 'both' ? (
                <>
                  {' '}
                  Set <code className={styles.code}>VITE_GENOME_FASTA_BASE_URL</code> for FASTA / FAI.
                </>
              ) : null}
              {baseUrlConfigError === 'gff' || baseUrlConfigError === 'both' ? (
                <>
                  {' '}
                  Set <code className={styles.code}>VITE_GENOME_GFF_BASE_URL</code> for GFF / tabix index.
                </>
              ) : null}
              {' '}
              Use local <code className={styles.code}>.env</code> or the same names on the pod (written to{' '}
              <code className={styles.code}>runtime-config.js</code>).
            </p>
          ) : null}
          {!hasSelectedTableRow ? (
            <p className={styles.hint}>Select a row in the results table to load the genome browser.</p>
          ) : null}
          {hasSelectedTableRow && !rowContext ? (
            <p className={styles.error} role="alert">
              The selected row does not include an assembly identifier (<code className={styles.code}>assembly_id</code>
              ).
            </p>
          ) : null}
          {selectionSummary ? <p className={styles.selectionSummary}>{selectionSummary}</p> : null}
          {isUsingTempTestFiles ? (
            <p className={styles.overrideNotice}>
              Temporary test-file override active. Remove after rendering check. Using{' '}
              <code className={styles.code}>{fastaUri ?? ''}</code> and{' '}
              <code className={styles.code}>{gffUri ?? ''}</code>.
            </p>
          ) : null}
          {sessionPlan?.kind === 'invalid' && sessionPlan.code === 'genotype_missing_region' ? (
            <p className={styles.error} role="alert">
              This genotype row does not include region coordinates (region, start, and end). The browser needs them to
              zoom to the correct locus.
            </p>
          ) : null}
          {sessionPlan?.kind === 'invalid' && sessionPlan.code === 'genotype_unknown_contig' ? (
            <p className={styles.error} role="alert">
              Region / contig{' '}
              <code className={styles.code}>{rowContext?.focusedRegion?.refName ?? ''}</code> was not found in the
              assembly index (FAI) for <code className={styles.code}>{rowContext?.assemblyId ?? ''}</code>.
            </p>
          ) : null}
          {sessionPlan?.kind === 'invalid' && sessionPlan.code === 'genotype_bad_interval' ? (
            <p className={styles.error} role="alert">
              Invalid region interval for this assembly.
            </p>
          ) : null}
          {loadData && rowContext && fastaUri && faiQuery.isLoading ? (
            <p className={styles.hint}>Loading assembly index…</p>
          ) : null}
          {loadData && faiQuery.isError ? (
            <p className={styles.error} role="alert">
              Could not load FAI from {faiUrl ? <code className={styles.code}>{faiUrl}</code> : 'unknown URL'}.{' '}
              {String(faiQuery.error)}
            </p>
          ) : null}
          {loadData &&
          !faiQuery.isLoading &&
          !faiQuery.isError &&
          rowContext &&
          fastaUri &&
          faiQuery.data?.length === 0 ? (
            <p className={styles.error} role="alert">
              Assembly index (FAI) was empty for <code className={styles.code}>{rowContext.assemblyId}</code>.
            </p>
          ) : null}
          {loadData && sessionReady && initializationError ? (
            <p className={styles.error} role="alert">
              Genome viewer failed to start: {initializationError.message}
            </p>
          ) : null}
          {showBrowser ? <GeneViewerContent viewState={viewState} highlightLocusId={highlightLocusId} /> : null}
        </div>
      ) : null}
    </section>
  );
};

export default GeneViewerPanel;
