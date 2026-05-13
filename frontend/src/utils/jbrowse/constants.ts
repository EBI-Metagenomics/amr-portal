/** Mirrors METT dataportal JBrowse zoom and track sizing. */
export const ZOOM_LEVELS = {
  MIN: -2,
  MAX: 5,
  NAV: 10,
  BP_PER_PX: 10,
  /** Used with interval width to pick `bpPerPx` for genotype zoom (~viewport width in bp at scale 1). */
  GENOTYPE_FOCUS_VIEWPORT_BP: 900,
  BP_PER_PX_MIN: 0.05,
  BP_PER_PX_MAX: 10,
} as const;

export const JBROWSE_TRACK_HEIGHTS = {
  REFERENCE_SEQUENCE: 40,
  STRUCTURAL_ANNOTATION: 250,
  GENE_FEATURE_HEIGHT: 15,
} as const;
