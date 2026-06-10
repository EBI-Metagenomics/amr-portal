type FacetMeta = {
  label: string;
  options: Map<string, string>;
};

export const buildFacetMetaMap = (
  facets: Array<{ id: string; label: string; options: Array<{ value: string; label: string }> }>
): Map<string, FacetMeta> => {
  const byId = new Map<string, FacetMeta>();
  for (const facet of facets) {
    byId.set(facet.id, {
      label: facet.label,
      options: new Map(facet.options.map(option => [option.value, option.label])),
    });
  }
  return byId;
};

/** Short or numeric values get a facet prefix (e.g. "Collection year: 2024"). */
export const formatFacetFilterTagLabel = (
  facetId: string,
  value: string,
  facetMeta: Map<string, FacetMeta>
): string => {
  const facet = facetMeta.get(facetId);
  const valueLabel = facet?.options.get(value) ?? value;
  const needsPrefix = /^\d+$/.test(valueLabel) || valueLabel.length <= 4;
  if (needsPrefix && facet) {
    return `${facet.label}: ${valueLabel}`;
  }
  return valueLabel;
};
