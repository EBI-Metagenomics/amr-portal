/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/tracks.ts`
 * (structural annotation only; no essentiality / trix / API merge).
 */

import { JBROWSE_TRACK_HEIGHTS } from '@utils/jbrowse/constants';

const getTracks = (assemblyName: string, gffUri: string) => {
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
          uri: `${gffUri}.tbi`,
        },
      },
    },
    visible: true,
    displays: [
      {
        displayId: `structural_annotation-${assemblyName}-LinearBasicDisplay`,
        type: 'LinearBasicDisplay',
        height: JBROWSE_TRACK_HEIGHTS.STRUCTURAL_ANNOTATION,
        onClick: null,
        onFeatureClick: null,
        onDoubleClick: null,
        renderer: {
          type: 'SvgFeatureRenderer',
          color1: `jexl:getGeneColor(feature)`,
          labels: {
            name: `jexl:
              (get(feature, 'gene') && get(feature, 'gene') + ' / ' + get(feature, 'locus_tag'))
              || get(feature, 'locus_tag')
            `,
          },
          height: JBROWSE_TRACK_HEIGHTS.GENE_FEATURE_HEIGHT,
          showForward: true,
          showReverse: true,
          showTranslation: true,
          showLabels: true,
        },
        mouseover: `jexl:
          (get(feature, 'gene') && 'Gene: ' + get(feature, 'gene')  + '<br/>'  || '') +
          (get(feature, 'locus_tag') && 'Locus Tag: ' + get(feature, 'locus_tag') + '<br/>' || '') +
          (get(feature, 'product') && 'Product: ' + get(feature, 'product') + '<br/>' || '') +
          (get(feature, 'Alias') && 'Alias: ' + get(feature, 'Alias') + '<br/>'  || '')
        `,
      },
    ],
  });

  return tracks;
};

export default getTracks;
