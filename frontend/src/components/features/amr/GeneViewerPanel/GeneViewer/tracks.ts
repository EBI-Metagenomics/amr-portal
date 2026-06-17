/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/tracks.ts`
 * (structural annotation only; no essentiality / trix / API merge).
 */

import { JBROWSE_TRACK_HEIGHTS } from '@utils/jbrowse/constants';

export function getStructuralAnnotationDisplayId(assemblyName: string): string {
  return `structural_annotation-${assemblyName}-LinearBasicDisplay`;
}

const getTracks = (assemblyName: string, gffUri: string) => {
  const displayId = getStructuralAnnotationDisplayId(assemblyName);
  const tracks = [];

  tracks.push({
    type: 'FeatureTrack',
    trackId: 'structural_annotation',
    name: 'Structural Annotation',
    assemblyNames: [assemblyName],
    category: ['Annotations'],
    height: JBROWSE_TRACK_HEIGHTS.STRUCTURAL_ANNOTATION,
    adapter: {
      type: 'EnhancedGeneFeatureAdapter',
      gffGzLocation: { uri: gffUri },
      index: {
        location: {
          uri: `${gffUri}.csi`,
        },
      },
    },
    visible: true,
    displays: [
      {
        displayId,
        type: 'LinearBasicDisplay',
        height: JBROWSE_TRACK_HEIGHTS.STRUCTURAL_ANNOTATION,
        onClick: null,
        onFeatureClick: null,
        onDoubleClick: null,
        renderer: {
          type: 'SvgFeatureRenderer',
          displayMode: 'normal',
          color1: 'jexl:getGeneColor(feature)',
          labels: {
            name: 'jexl:getGeneLabel(feature)',
            nameColor: '#0f172a',
            fontSize: 10,
          },
          height: JBROWSE_TRACK_HEIGHTS.GENE_FEATURE_HEIGHT,
          maxFeatureGlyphExpansion: 500,
          showForward: true,
          showReverse: true,
          showTranslation: true,
          showLabels: true,
          showDescriptions: false,
        },
        mouseover: `jexl:
          (get(feature, 'gene') && 'Gene: ' + get(feature, 'gene')  + '<br/>'  || '') +
          (get(feature, 'locus_tag') && 'Locus Tag: ' + get(feature, 'locus_tag') + '<br/>' || '') +
          (get(feature, 'product') && 'Product: ' + get(feature, 'product') + '<br/>' || '') +
          (get(feature, 'amrfinderplus_element_symbol') && 'Element: ' + get(feature, 'amrfinderplus_element_symbol') + '<br/>' || '') +
          (get(feature, 'amrfinderplus_element_name') && 'Element name: ' + get(feature, 'amrfinderplus_element_name') + '<br/>' || '') +
          (get(feature, 'drug_class') && 'Drug class: ' + get(feature, 'drug_class') + '<br/>' || '') +
          (get(feature, 'Alias') && 'Alias: ' + get(feature, 'Alias') + '<br/>'  || '')
        `,
      },
    ],
  });

  return tracks;
};

export default getTracks;
