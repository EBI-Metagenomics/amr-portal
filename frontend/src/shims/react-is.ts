/**
 * ESM named exports for CJS `react-is` (used by @mui/utils/deepmerge).
 */
import * as reactIsModule from 'react-is/index.js';
import { cjsDefaultExport } from './cjsDefault';

const reactIs = cjsDefaultExport(reactIsModule) as typeof import('react-is');

export const ContextConsumer = reactIs.ContextConsumer;
export const ContextProvider = reactIs.ContextProvider;
export const Element = reactIs.Element;
export const ForwardRef = reactIs.ForwardRef;
export const Fragment = reactIs.Fragment;
export const Lazy = reactIs.Lazy;
export const Memo = reactIs.Memo;
export const Portal = reactIs.Portal;
export const Profiler = reactIs.Profiler;
export const StrictMode = reactIs.StrictMode;
export const Suspense = reactIs.Suspense;
export const SuspenseList = reactIs.SuspenseList;
export const isContextConsumer = reactIs.isContextConsumer;
export const isContextProvider = reactIs.isContextProvider;
export const isElement = reactIs.isElement;
export const isForwardRef = reactIs.isForwardRef;
export const isFragment = reactIs.isFragment;
export const isLazy = reactIs.isLazy;
export const isMemo = reactIs.isMemo;
export const isPortal = reactIs.isPortal;
export const isProfiler = reactIs.isProfiler;
export const isStrictMode = reactIs.isStrictMode;
export const isSuspense = reactIs.isSuspense;
export const isSuspenseList = reactIs.isSuspenseList;
export const isValidElementType = reactIs.isValidElementType;
export const typeOf = reactIs.typeOf;

export default reactIs;
