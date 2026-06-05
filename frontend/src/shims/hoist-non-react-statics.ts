/**
 * ESM default export for CJS `hoist-non-react-statics` (used by @emotion/react).
 */
import * as hnrsModule from 'hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js';
import { cjsDefaultExport } from './cjsDefault';

export default cjsDefaultExport(hnrsModule) as (
  target: unknown,
  source: unknown,
  exclude?: Record<string, boolean>
) => unknown;
