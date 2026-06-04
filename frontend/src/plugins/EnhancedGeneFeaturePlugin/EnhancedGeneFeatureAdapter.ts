import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter';
import SimpleFeature from '@jbrowse/core/util/simpleFeature';
import type { SimpleFeatureSerialized } from '@jbrowse/core/util/simpleFeature';
import { from, type Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { FeatureProcessor, GFFParser } from './services';

export default class EnhancedGeneFeatureAdapter extends BaseFeatureDataAdapter {
  static type = 'EnhancedGeneFeatureAdapter';

  private gffLocation: string;
  private cache: Map<string, SimpleFeature[]> = new Map();
  private gffParser: GFFParser;

  private getCacheKey(region: { refName: string; start: number; end: number }): string {
    return `${region.refName}:${region.start}-${region.end}`;
  }

  constructor(config: Record<string, unknown>) {
    super(config as never);
    const gffGzLocation = config.gffGzLocation as { value?: { uri?: string } };
    this.gffLocation = gffGzLocation?.value?.uri ?? '';
    this.gffParser = new GFFParser();
  }

  async freeResources(): Promise<void> {
    /* noop */
  }

  async getRefNames(): Promise<string[]> {
    return [];
  }

  getFeatures(region: { refName: string; start: number; end: number }): Observable<SimpleFeature> {
    const cacheKey = this.getCacheKey(region);
    if (this.cache.has(cacheKey)) {
      return from(this.cache.get(cacheKey)!);
    }

    const featuresPromise = this.fetchGFF(region)
      .then(gffFeatures => {
        const features = gffFeatures.map(serialized => new SimpleFeature(serialized));
        return FeatureProcessor.flattenAttributes(features);
      })
      .catch(() => []);

    return from(featuresPromise).pipe(
      mergeMap(features => {
        this.cache.set(cacheKey, features);
        return from(features);
      })
    );
  }

  async fetchGFF(region: { refName: string; start: number; end: number }): Promise<SimpleFeatureSerialized[]> {
    const all = await this.gffParser.parseGFF(this.gffLocation);
    return this.gffParser.filterFeaturesByRegion(all, region);
  }

  clearGFFCache() {
    this.gffParser.clearGFFCache();
  }

  clearFeatureCache() {
    this.cache.clear();
  }
}
