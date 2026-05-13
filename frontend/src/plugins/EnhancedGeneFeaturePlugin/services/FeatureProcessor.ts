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
      return new SimpleFeature({
        ...featureWithoutAttributes,
        ...attributes,
      });
    });
  }
}
