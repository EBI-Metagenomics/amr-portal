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

const GeneViewerPanel = ({
  isCollapsed,
  onToggleCollapsed,
  rowContext,
  hasSelectedTableRow,
  loadData,
}: Props) => {
  const {
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
  } = useGenomeBrowserResources(loadData, hasSelectedTableRow, rowContext);

  const { assembly, tracks, sessionConfig } = useAmrGeneViewerConfig(
    genomeMeta,
    fastaAssemblyDirectoryUrl,
    gffUriReady,
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
    Boolean(fastaAssemblyDirectoryUrl) &&
    Boolean(gffAssemblyDirectoryUrl) &&
    sessionReady &&
    !isCollapsed &&
    !faiQuery.isLoading &&
    !faiQuery.isError &&
    !initializationError;

  const highlightLocusId = showBrowser ? (rowContext?.locusTag ?? null) : null;

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
          {!fastaBaseUrl || !gffBaseUrl ? (
            <p className={styles.error} role="alert">
              Genome file roots are not fully configured.
              {!fastaBaseUrl ? (
                <>
                  {' '}
                  Set <code className={styles.code}>VITE_GENOME_FASTA_BASE_URL</code> for FASTA / FAI.
                </>
              ) : null}
              {!gffBaseUrl ? (
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
          {rowContext && (!fastaAssemblyDirectoryUrl || !gffAssemblyDirectoryUrl) && fastaBaseUrl && gffBaseUrl ? (
            <p className={styles.error} role="alert">
              Could not derive genome paths from assembly id{' '}
              <code className={styles.code}>{rowContext.assemblyId}</code>. Expected a value like{' '}
              <code className={styles.code}>GCA_000214965.2</code>.
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
          {loadData && rowContext && fastaAssemblyDirectoryUrl && faiQuery.isLoading ? (
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
          fastaAssemblyDirectoryUrl &&
          faiQuery.data?.length === 0 ? (
            <p className={styles.error} role="alert">
              Assembly index (FAI) was empty for <code className={styles.code}>{assemblyId ?? ''}</code>.
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
