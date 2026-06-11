import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const src = (subdir: string) => fileURLToPath(new URL(`./src/${subdir}`, import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '')
  const portalPrefix = (env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '')
  const base = env.VITE_APP_BASE || `${portalPrefix}/data/`

  return {
    root: appRoot,
    base,
    plugins: [
      react({
        include: [/\.tsx?$/, /\.jsx?$/, /node_modules\/@jbrowse\//],
      }),
      {
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
      },
      {
        name: 'amr-jbrowse-worker-stub',
        load(id) {
          if (id.includes('makeWorkerInstance.js')) {
            return 'export default function makeWorkerInstance() { return null }\n'
          }
        },
      },
    ],
    define: {
      global: 'globalThis',
    },
    build: {
      outDir: 'app-dist',
      target: 'es2020',
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': src(''),
        '@components': src('components'),
        '@services': src('services'),
        '@interfaces': src('interfaces'),
        '@utils': src('utils'),
        buffer: 'buffer/',
      },
    },
    optimizeDeps: {
      include: ['file-saver'],
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
  }
})
