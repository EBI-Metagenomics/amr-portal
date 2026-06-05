import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const jbrowsePluginShim = fileURLToPath(
  new URL('./src/shims/jbrowse-plugin.ts', import.meta.url)
)
const jbrowseAdapterTypeShim = fileURLToPath(
  new URL('./src/shims/jbrowse-adapter-type.ts', import.meta.url)
)
const jbrowseSimpleFeatureShim = fileURLToPath(
  new URL('./src/shims/jbrowse-simple-feature.ts', import.meta.url)
)
const hoistNonReactStaticsShim = fileURLToPath(
  new URL('./src/shims/hoist-non-react-statics.ts', import.meta.url)
)
const propTypesShim = fileURLToPath(new URL('./src/shims/prop-types.ts', import.meta.url))
const reactIsShim = fileURLToPath(new URL('./src/shims/react-is.ts', import.meta.url))
const useSyncExternalStoreShim = fileURLToPath(
  new URL('./src/shims/use-sync-external-store-shim.ts', import.meta.url)
)

/** Serve bgzip sidecars without wrong Content-Encoding (same idea as METT dataportal). */
const bgzipHeadersPlugin = () => ({
  name: 'amr-bgzip-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.includes('.fa.gz') || req.url?.includes('.gff.gz')) {
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Encoding', 'identity')
      }
      next()
    })
  },
})

/** Avoid worker bundle issues in dev; RPC uses MainThreadRpcDriver in viewer config. */
const jbrowseWorkerStubPlugin = () => ({
  name: 'amr-jbrowse-worker-stub',
  load(id: string) {
    if (id.includes('makeWorkerInstance.js')) {
      return `export default function makeWorkerInstance() { return null }\n`
    }
    return null
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '')
  const portalPrefix = (env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '')
  const base = env.VITE_APP_BASE || `${portalPrefix}/data/`

  return {
    root: appRoot,
    plugins: [
      react({
        // JBrowse has JSX in .js files; do NOT use optimizeDeps esbuild `.js: jsx` (breaks Plugin.js).
        include: [/\.tsx?$/, /\.jsx?$/, /node_modules\/@jbrowse\//],
      }),
      bgzipHeadersPlugin(),
      jbrowseWorkerStubPlugin(),
    ],
    base,
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: [
        'file-saver',
        'hoist-non-react-statics',
        'prop-types',
        'react-is',
        // Pre-bundle CJS @jbrowse/core barrels (named ESM imports). Plugin uses shim alias below.
        '@jbrowse/core/ui',
        '@jbrowse/core/configuration',
        '@jbrowse/react-app2',
        '@jbrowse/plugin-linear-genome-view',
        '@jbrowse/product-core',
        '@jbrowse/sv-core',
      ],
      // JSX in JBrowse .js during dependency optimization (Vite 8: prefer rolldown when available).
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
      // Do not pre-bundle Plugin — breaks `extends Plugin`; app imports go through jbrowse-plugin shim.
      exclude: [
        '@jbrowse/core/Plugin',
        '@jbrowse/core/pluggableElementTypes/AdapterType',
        '@jbrowse/core/util/simpleFeature',
      ],
    },
    build: {
      outDir: 'app-dist',
      target: 'es2015',
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        { find: /^@jbrowse\/core\/Plugin$/, replacement: jbrowsePluginShim },
        {
          find: /^@jbrowse\/core\/pluggableElementTypes\/AdapterType$/,
          replacement: jbrowseAdapterTypeShim,
        },
        { find: /^@jbrowse\/core\/util\/simpleFeature$/, replacement: jbrowseSimpleFeatureShim },
        { find: /^hoist-non-react-statics$/, replacement: hoistNonReactStaticsShim },
        { find: /^prop-types$/, replacement: propTypesShim },
        { find: /^react-is$/, replacement: reactIsShim },
        { find: /^use-sync-external-store\/shim$/, replacement: useSyncExternalStoreShim },
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        { find: '@components', replacement: fileURLToPath(new URL('./src/components', import.meta.url)) },
        { find: '@services', replacement: fileURLToPath(new URL('./src/services', import.meta.url)) },
        { find: '@interfaces', replacement: fileURLToPath(new URL('./src/interfaces', import.meta.url)) },
        { find: '@utils', replacement: fileURLToPath(new URL('./src/utils', import.meta.url)) },
        { find: 'buffer', replacement: 'buffer/' },
      ],
    },
  }
})
