import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GFFParser } from '@/plugins/EnhancedGeneFeaturePlugin/services/GFFParser';
import { buildFeatureAnnotations, type FeatureAnnotation } from './featureAnnotations';

export type FeaturePanelFeature = {
  id: string;
  locusTag: string;
  gene: string | null;
  product: string | null;
  alias: string[];
  seqId: string;
  start: number;
  end: number;
  strand: number;
  note: string | null;
  dbxref: string[];
  annotations: FeatureAnnotation[];
};

const gffParser = new GFFParser();

function splitAttributeList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function toFeaturePanelFeature(
  feature: Awaited<ReturnType<GFFParser['parseGFF']>>[number]
): FeaturePanelFeature | null {
  const attributes =
    feature.attributes && typeof feature.attributes === 'object'
      ? (feature.attributes as Record<string, string>)
      : null;

  const locusTag = attributes?.locus_tag?.trim();
  if (!locusTag) return null;

  return {
    id: feature.uniqueId || locusTag,
    locusTag,
    gene: attributes?.gene?.trim() || attributes?.Name?.trim() || null,
    product: attributes?.product?.trim() || null,
    alias: splitAttributeList(attributes?.Alias),
    seqId: feature.refName,
    start: feature.start,
    end: feature.end,
    strand: typeof feature.strand === 'number' ? feature.strand : 0,
    note: attributes?.Note?.trim() || null,
    dbxref: splitAttributeList(attributes?.Dbxref),
    annotations: buildFeatureAnnotations(attributes ?? {}),
  };
}

function indexFeature(
  index: Map<string, FeaturePanelFeature>,
  feature: FeaturePanelFeature
): void {
  index.set(feature.locusTag, feature);
  if (feature.id !== feature.locusTag) {
    index.set(feature.id, feature);
  }
}

export function useFeatureDetails(gffUri: string | null, selectedLocusTag: string | null) {
  const featureIndexQuery = useQuery({
    queryKey: ['gene-viewer-feature-index', gffUri],
    enabled: Boolean(gffUri),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      if (!gffUri) return new Map<string, FeaturePanelFeature>();
      const features = await gffParser.parseGFF(gffUri);
      return features.reduce((acc, feature) => {
        const normalized = toFeaturePanelFeature(feature);
        if (normalized) indexFeature(acc, normalized);
        return acc;
      }, new Map<string, FeaturePanelFeature>());
    },
  });

  const selectedFeature = useMemo(() => {
    if (!selectedLocusTag) return null;
    const trimmed = selectedLocusTag.trim();
    return featureIndexQuery.data?.get(trimmed) ?? null;
  }, [featureIndexQuery.data, selectedLocusTag]);

  return {
    selectedFeature,
    isLoading: featureIndexQuery.isLoading,
    error: featureIndexQuery.error,
  };
}
