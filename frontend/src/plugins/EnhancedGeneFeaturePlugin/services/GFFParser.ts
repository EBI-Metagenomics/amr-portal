import { unzip } from '@gmod/bgzf-filehandle';
import type { SimpleFeatureSerialized } from '@jbrowse/core/util/simpleFeature';

/** Split GFF3 attributes on semicolons that start the next key=value pair. */
export function parseGffAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const pair of attrString.split(/;(?=[^=;]+=)/)) {
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) attributes[key] = value;
  }
  return attributes;
}

const GENE_ANNOTATION_TYPES = new Set(['gene', 'CDS', 'mRNA', 'tRNA', 'rRNA', 'ncRNA', 'pseudogene']);

const GENE_ANNOTATION_TYPE_RANK: Record<string, number> = {
  gene: 0,
  mRNA: 1,
  CDS: 2,
  tRNA: 3,
  rRNA: 4,
  ncRNA: 5,
  pseudogene: 6,
};

function dedupeByLocusTag(features: SimpleFeatureSerialized[]): SimpleFeatureSerialized[] {
  const byLocusTag = new Map<string, SimpleFeatureSerialized>();
  for (const feature of features) {
    const locusTag =
      (feature.attributes as Record<string, string> | undefined)?.locus_tag?.trim();
    if (!locusTag) continue;
    const existing = byLocusTag.get(locusTag);
    if (!existing) {
      byLocusTag.set(locusTag, feature);
      continue;
    }
    const nextRank = GENE_ANNOTATION_TYPE_RANK[feature.type] ?? 99;
    const existingRank = GENE_ANNOTATION_TYPE_RANK[existing.type] ?? 99;
    if (nextRank < existingRank) {
      byLocusTag.set(locusTag, feature);
    }
  }
  return Array.from(byLocusTag.values());
}

export class GFFParser {
  private gffCache: Map<string, SimpleFeatureSerialized[]> = new Map();

  async parseGFF(gffLocation: string): Promise<SimpleFeatureSerialized[]> {
    if (this.gffCache.has(gffLocation)) {
      return this.gffCache.get(gffLocation) ?? [];
    }

    try {
      const response = await fetch(gffLocation);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const gffFile = new Uint8Array(arrayBuffer);
      const isGzip = gffFile[0] === 0x1f && gffFile[1] === 0x8b;

      const gffContents = isGzip
        ? new TextDecoder('utf-8').decode(await unzip(gffFile))
        : new TextDecoder('utf-8').decode(gffFile);

      const features: SimpleFeatureSerialized[] = [];
      const lines = gffContents.split('\n');

      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length < 9) continue;

        const [refName, , type, start, end, , strand] = parts;
        const attributes = parseGffAttributes(parts[8]);

        if (GENE_ANNOTATION_TYPES.has(type) && attributes.locus_tag) {
          const gffStart = parseInt(start, 10);
          const gffEnd = parseInt(end, 10);
          features.push({
            uniqueId: attributes.locus_tag,
            refName,
            // GFF is 1-based inclusive; JBrowse uses 0-based coordinates with exclusive end.
            start: gffStart - 1,
            end: gffEnd,
            strand: strand === '+' ? 1 : -1,
            type,
            attributes,
          });
        }
      }

      const dedupedFeatures = dedupeByLocusTag(features);
      this.gffCache.set(gffLocation, dedupedFeatures);
      return dedupedFeatures;
    } catch (error) {
      console.error('Error fetching GFF file:', error);
      return [];
    }
  }

  filterFeaturesByRegion(features: SimpleFeatureSerialized[], region: { refName: string; start: number; end: number }) {
    return features.filter(
      feature =>
        feature.refName === region.refName &&
        feature.start < region.end &&
        feature.end > region.start
    );
  }

  clearGFFCache() {
    this.gffCache.clear();
  }
}
