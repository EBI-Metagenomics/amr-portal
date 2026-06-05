/**
 * ESM default export for CJS `@jbrowse/core/util/simpleFeature`.
 */
import * as simpleFeatureModule from '@jbrowse/core/util/simpleFeature.js';
import { cjsDefaultExport } from './cjsDefault';

const SimpleFeature = cjsDefaultExport(simpleFeatureModule);

export default SimpleFeature;

export const isFeature =
  typeof (simpleFeatureModule as { isFeature?: unknown }).isFeature === 'function'
    ? (simpleFeatureModule as { isFeature: (thing: unknown) => boolean }).isFeature
    : () => false;
