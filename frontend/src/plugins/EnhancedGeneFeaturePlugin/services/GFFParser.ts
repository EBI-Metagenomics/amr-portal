import { unzip } from '@gmod/bgzf-filehandle';
import type { SimpleFeatureSerialized } from '@jbrowse/core/util/simpleFeature';
import pako from 'pako';

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
      let gffFile = new Uint8Array(arrayBuffer);
      const isGzip = gffFile[0] === 0x1f && gffFile[1] === 0x8b;

      let gffContents: string;
      if (isGzip) {
        try {
          const compressedData = await this.decompressBgzip(gffFile);
          gffContents = new TextDecoder('utf-8').decode(compressedData);
        } catch {
          const compressedData = await unzip(gffFile);
          gffContents = new TextDecoder('utf-8').decode(compressedData);
        }
      } else {
        gffContents = new TextDecoder('utf-8').decode(gffFile);
      }

      const features: SimpleFeatureSerialized[] = [];
      const lines = gffContents.split('\n');

      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length < 9) continue;

        const [refName, , type, start, end, , strand] = parts;
        const attributes: Record<string, string> = {};
        const attrString = parts[8];
        const attrPairs = attrString.split(';');

        for (const pair of attrPairs) {
          const [key, ...valueParts] = pair.split('=');
          if (key && valueParts.length > 0) {
            attributes[key.trim()] = valueParts.join('=').trim();
          }
        }

        if (type === 'gene' && attributes.locus_tag) {
          features.push({
            uniqueId: attributes.locus_tag,
            refName,
            start: parseInt(start, 10),
            end: parseInt(end, 10),
            strand: strand === '+' ? 1 : -1,
            type,
            attributes,
          });
        }
      }

      this.gffCache.set(gffLocation, features);
      return features;
    } catch (error) {
      console.error('Error fetching GFF file:', error);
      return [];
    }
  }

  private async decompressBgzip(data: Uint8Array): Promise<Uint8Array> {
    try {
      return new Uint8Array(pako.inflate(data));
    } catch {
      // continue
    }
    try {
      return new Uint8Array(pako.inflateRaw(data));
    } catch {
      // continue
    }
    if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
      try {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(data);
            controller.close();
          },
        });
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const reader = decompressedStream.getReader();
        const chunks: Uint8Array[] = [];
        let reading = true;
        while (reading) {
          const { done, value } = await reader.read();
          if (done) reading = false;
          else chunks.push(value);
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        return result;
      } catch {
        // continue
      }
    }
    return unzip(data);
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
