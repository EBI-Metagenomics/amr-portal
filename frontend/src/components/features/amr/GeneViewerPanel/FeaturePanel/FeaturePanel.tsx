import { useCallback, useMemo, useState } from 'react';
import type { FeaturePanelFeature } from './useFeatureDetails';
import { ALL_SECTION_IDS, DEFAULT_EXPANDED_SECTIONS, type SectionId } from './constants';
import styles from './FeaturePanel.module.css';

type Props = {
  feature: FeaturePanelFeature | null;
  isLoading: boolean;
  error: Error | null;
};

type CollapsibleSectionProps = {
  title: string;
  sectionId: SectionId;
  expanded: boolean;
  onToggle: (sectionId: SectionId) => void;
  children: React.ReactNode;
};

function formatStrand(strand: number): string {
  if (strand > 0) return 'Forward (+)';
  if (strand < 0) return 'Reverse (-)';
  return 'Unknown';
}

function CollapsibleSection({
  title,
  sectionId,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const headerId = `gene-viewer-feature-section-header-${sectionId}`;
  const contentId = `gene-viewer-feature-section-content-${sectionId}`;

  return (
    <section className={styles.section}>
      <button
        type="button"
        id={headerId}
        className={styles.sectionHeader}
        onClick={() => onToggle(sectionId)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <span
          className={`${styles.sectionChevron} ${expanded ? styles.sectionChevronExpanded : ''}`}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.sectionTitle}>{title}</span>
      </button>
      {expanded ? (
        <div id={contentId} role="region" aria-labelledby={headerId} className={styles.sectionBody}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.value}>{value}</div>
    </div>
  );
}

const FeaturePanel = ({ feature, isLoading, error }: Props) => {
  const [expandedSections, setExpandedSections] =
    useState<Record<SectionId, boolean>>(DEFAULT_EXPANDED_SECTIONS);

  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const allExpanded = useMemo(
    () => ALL_SECTION_IDS.every(sectionId => expandedSections[sectionId]),
    [expandedSections]
  );

  const toggleAll = useCallback(() => {
    const nextExpanded = !allExpanded;
    setExpandedSections(
      ALL_SECTION_IDS.reduce(
        (acc, sectionId) => {
          acc[sectionId] = nextExpanded;
          return acc;
        },
        {} as Record<SectionId, boolean>
      )
    );
  }, [allExpanded]);

  const hasAnnotations = Boolean(
    feature?.gene ||
      feature?.product ||
      feature?.alias.length ||
      feature?.note ||
      feature?.dbxref.length ||
      feature?.annotations.length
  );

  return (
    <aside className={styles.featurePanel} aria-label="Selected gene details">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Feature Details</h3>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={toggleAll}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? <p className={styles.notice}>Loading feature annotations…</p> : null}
        {!isLoading && error ? <p className={styles.error}>Could not load feature details: {error.message}</p> : null}
        {!isLoading && !error && !feature ? (
          <div className={styles.emptyState}>
            <p>Select a gene in the viewer to open its details here.</p>
          </div>
        ) : null}
        {!isLoading && !error && feature ? (
          <>
            <CollapsibleSection
              title="Core Details"
              sectionId="core"
              expanded={expandedSections.core}
              onToggle={toggleSection}
            >
              <Field label="Locus Tag" value={<span className={styles.locusBadge}>{feature.locusTag}</span>} />
              {feature.gene ? <Field label="Gene" value={feature.gene} /> : null}
              {feature.product ? <Field label="Product" value={feature.product} /> : null}
              {feature.alias.length ? <Field label="Alias" value={feature.alias.join(', ')} /> : null}
            </CollapsibleSection>

            <CollapsibleSection
              title="Location"
              sectionId="location"
              expanded={expandedSections.location}
              onToggle={toggleSection}
            >
              <Field label="Sequence ID" value={feature.seqId} />
              <Field label="Position" value={`${feature.start.toLocaleString()} - ${feature.end.toLocaleString()}`} />
              <Field label="Strand" value={formatStrand(feature.strand)} />
              <Field label="Feature ID" value={feature.id} />
            </CollapsibleSection>

            {hasAnnotations ? (
              <CollapsibleSection
                title="Annotations"
                sectionId="annotations"
                expanded={expandedSections.annotations}
                onToggle={toggleSection}
              >
                {feature.note ? <Field label="Note" value={feature.note} /> : null}
                {feature.dbxref.length ? <Field label="Dbxref" value={feature.dbxref.join(', ')} /> : null}
                {feature.annotations.map(annotation => (
                  <Field key={annotation.key} label={annotation.label} value={annotation.value} />
                ))}
              </CollapsibleSection>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
};

export default FeaturePanel;
