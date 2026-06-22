export type SectionId = 'core' | 'location' | 'annotations';

export const ALL_SECTION_IDS: readonly SectionId[] = ['core', 'location', 'annotations'] as const;

export const DEFAULT_EXPANDED_SECTIONS: Record<SectionId, boolean> = {
  core: true,
  location: false,
  annotations: false,
};
