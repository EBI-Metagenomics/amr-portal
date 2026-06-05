/**
 * ESM default export for CJS `@jbrowse/core/pluggableElementTypes/AdapterType`.
 */
import * as adapterTypeModule from '@jbrowse/core/pluggableElementTypes/AdapterType.js';
import { cjsDefaultExport } from './cjsDefault';

export default cjsDefaultExport(adapterTypeModule) as new (config: {
  name: string;
  displayName: string;
  configSchema: unknown;
  getAdapterClass: () => Promise<unknown>;
}) => unknown;
