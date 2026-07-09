/** Mirrors METT dataportal JBrowse zoom and track sizing. */
export const ZOOM_LEVELS = {
  MIN: -2,
  MAX: 5,
  NAV: 10,
  BP_PER_PX: 10,
  /** Estimated linear view width in px (genotype zoom + scroll centering). */
  VIEWPORT_WIDTH_PX: 1200,
  /** Multiplier on selected gene span when picking initial zoom. */
  GENOTYPE_NEIGHBOR_PADDING: 6,
  /** Minimum bp visible around the selected gene (shows neighboring genes). */
  GENOTYPE_MIN_VIEWPORT_BP: 24_000,
  /** Maximum bp visible on initial load (avoids overly zoomed-out huge genes). */
  GENOTYPE_MAX_VIEWPORT_BP: 60_000,
  BP_PER_PX_MIN: 0.05,
  BP_PER_PX_MAX: 10,
  /** Genotype rows can zoom out further than the default phenotype cap. */
  GENOTYPE_BP_PER_PX_MAX: 50,
} as const;

export const JBROWSE_TRACK_HEIGHTS = {
  REFERENCE_SEQUENCE: 40,
  STRUCTURAL_ANNOTATION: 250,
  GENE_FEATURE_HEIGHT: 15,
} as const;


/** Colours for JBrowse gene features (selection highlight vs default fill). */
export const VIEWPORT_SYNC_CONSTANTS = {
  GENE_HIGHLIGHT_COLOR: '#1093df',
  GENE_DEFAULT_FILL_COLOR: '#4a5568',
} as const;
