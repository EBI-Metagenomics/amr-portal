import SimpleFeature from '@jbrowse/core/util/simpleFeature';

export class FeatureProcessor {
  static flattenAttributes(features: SimpleFeature[]): SimpleFeature[] {
    return features.map(feature => {
      const featureData = feature.toJSON();
      const attributes =
        featureData.attributes && typeof featureData.attributes === 'object'
          ? (featureData.attributes as Record<string, string>)
          : {};
      const { attributes: _attrs, ...featureWithoutAttributes } = featureData;
      const locusTag = attributes.locus_tag?.trim();
      const gene =
        attributes.gene?.trim() || attributes.Name?.trim() || attributes.gene_name?.trim() || undefined;
      const name = gene && locusTag ? `${gene} / ${locusTag}` : locusTag || gene;
      return new SimpleFeature({
        ...featureWithoutAttributes,
        ...attributes,
        ...(gene ? { gene } : {}),
        ...(name ? { name } : {}),
      });
    });
  }
}
