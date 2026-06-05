import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter';
import { resolveUriLocation } from '@jbrowse/core/util/io';
import SimpleFeature from '@jbrowse/core/util/simpleFeature';
import type { SimpleFeatureSerialized } from '@jbrowse/core/util/simpleFeature';
import { from, type Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { FeatureProcessor, GFFParser } from './services';

type FileLocationConf = { uri?: string; baseUri?: string };

export default class EnhancedGeneFeatureAdapter extends BaseFeatureDataAdapter {
  static type = 'EnhancedGeneFeatureAdapter';

  private cache: Map<string, SimpleFeature[]> = new Map();
  private gffParser: GFFParser;
  private refNamesCache: string[] | null = null;

  private getCacheKey(region: { refName: string; start: number; end: number }): string {
    return `${region.refName}:${region.start}-${region.end}`;
  }

  constructor(...args: ConstructorParameters<typeof BaseFeatureDataAdapter>) {
    super(...args);
    this.gffParser = new GFFParser();
  }

  /** Read GFF URI from MST config (same as Gff3TabixAdapter via getConf). */
  private getGffUri(): string {
    const location = this.getConf('gffGzLocation') as FileLocationConf;
    if (!location?.uri) return '';
    return resolveUriLocation(location).uri;
  }

  async freeResources(): Promise<void> {
    /* noop */
  }

  async getRefNames(): Promise<string[]> {
    if (this.refNamesCache) return this.refNamesCache;
    const uri = this.getGffUri();
    if (!uri) return [];
    const all = await this.gffParser.parseGFF(uri);
    this.refNamesCache = [...new Set(all.map(f => f.refName))].sort();
    return this.refNamesCache;
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
      .catch(err => {
        console.error('EnhancedGeneFeatureAdapter: failed to load features', err);
        return [];
      });

    return from(featuresPromise).pipe(
      mergeMap(features => {
        this.cache.set(cacheKey, features);
        return from(features);
      })
    );
  }

  async fetchGFF(region: { refName: string; start: number; end: number }): Promise<SimpleFeatureSerialized[]> {
    const uri = this.getGffUri();
    if (!uri) return [];
    const all = await this.gffParser.parseGFF(uri);
    return this.gffParser.filterFeaturesByRegion(all, region);
  }

  clearGFFCache() {
    this.gffParser.clearGFFCache();
    this.refNamesCache = null;
  }

  clearFeatureCache() {
    this.cache.clear();
  }
}
