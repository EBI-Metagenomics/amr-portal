import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

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
  // Load .env from frontend/ even when `npm run --prefix frontend dev` leaves cwd at repo root.
  const env = loadEnv(mode, appRoot, '');
  const portalPrefix = (env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '');
  const base = env.VITE_APP_BASE || `${portalPrefix}/data/`;

  return {
    root: appRoot,
    plugins: [react(), bgzipHeadersPlugin(), jbrowseWorkerStubPlugin()],
    base,
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['file-saver'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: 'app-dist',
      target: 'es2015',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@interfaces': fileURLToPath(new URL('./src/interfaces', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        buffer: 'buffer/',
      },
    },
  };
})
