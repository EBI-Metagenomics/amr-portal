/** JBrowse feature shape after {@link FeatureProcessor.flattenAttributes}. */
export type JbrowseFeatureLike = Record<string, unknown> & {
  get?: (key: string) => unknown;
};

function readFeatureString(feature: JbrowseFeatureLike, key: string): string | undefined {
  const raw = feature[key] ?? feature.get?.(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/** Gene symbol from GFF attributes (`gene`, `Name`, or `gene_name`). */
export function readGeneName(feature: JbrowseFeatureLike): string | undefined {
  return (
    readFeatureString(feature, 'gene') ??
    readFeatureString(feature, 'Name') ??
    readFeatureString(feature, 'gene_name')
  );
}

/** METT-style track label: `gene / locus_tag`, or locus tag alone when gene name is missing. */
export function getGeneLabel(feature: JbrowseFeatureLike): string {
  const locusTag = readFeatureString(feature, 'locus_tag');
  const geneName = readGeneName(feature);
  if (geneName && locusTag) return `${geneName} / ${locusTag}`;
  return locusTag ?? geneName ?? '';
}
