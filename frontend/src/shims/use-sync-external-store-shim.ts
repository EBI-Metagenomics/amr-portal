/**
 * mobx-react-lite imports `use-sync-external-store/shim` (CJS).
 * React 19 includes `useSyncExternalStore` natively — re-export avoids CJS interop.
 */
export { useSyncExternalStore } from 'react';
