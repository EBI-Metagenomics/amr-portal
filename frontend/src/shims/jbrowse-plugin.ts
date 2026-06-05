/**
 * ESM default export for CJS `@jbrowse/core/Plugin`.
 * Required because Vite must not treat Plugin.js as JSX during dependency optimization.
 */
// .js suffix bypasses the `@jbrowse/core/Plugin` alias (this file is the alias target).
import * as pluginModule from '@jbrowse/core/Plugin.js';
import { cjsDefaultExport } from './cjsDefault';

export default cjsDefaultExport(pluginModule) as new () => {
  install(pluginManager: unknown): void;
};
