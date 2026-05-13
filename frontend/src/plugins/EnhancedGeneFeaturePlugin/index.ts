import AdapterType from '@jbrowse/core/pluggableElementTypes/AdapterType';
import Plugin from '@jbrowse/core/Plugin';
import type PluginManager from '@jbrowse/core/PluginManager';
import configSchema from './configSchema';
import { VIEWPORT_SYNC_CONSTANTS } from '@utils/jbrowse/viewportSyncConstants';

export default class EnhancedGeneFeaturePlugin extends Plugin {
  name = 'EnhancedGeneFeaturePlugin';

  install(pluginManager: PluginManager) {
    pluginManager.jexl.addFunction('selectedGeneId', () => {
      return (typeof window !== 'undefined' && window.selectedGeneId) || null;
    });

    pluginManager.jexl.addFunction(
      'getGeneColor',
      (feature: Record<string, unknown> & { get?: (k: string) => unknown }) => {
        const locusTag =
          (feature?.locus_tag as string | undefined) ?? (feature?.get?.('locus_tag') as string | undefined);
        const selectedId = (typeof window !== 'undefined' && window.selectedGeneId) || null;
        if (selectedId && locusTag === selectedId) {
          return VIEWPORT_SYNC_CONSTANTS.GENE_HIGHLIGHT_COLOR;
        }
        return VIEWPORT_SYNC_CONSTANTS.GENE_DEFAULT_FILL_COLOR;
      }
    );

    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: 'EnhancedGeneFeatureAdapter',
          displayName: 'Enhanced Gene Feature Adapter',
          configSchema,
          getAdapterClass: () => import('./EnhancedGeneFeatureAdapter').then(r => r.default),
        })
    );
  }
}
