import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  // Load .env from portal-app/ even when `npm run --prefix portal-app dev` leaves cwd at repo root.
  const env = loadEnv(mode, appRoot, '');
  const portalPrefix = (env.VITE_PORTAL_PREFIX || '/amr').replace(/\/$/, '');
  const base = env.VITE_APP_BASE || `${portalPrefix}/data/`;

  return {
    root: appRoot,
    plugins: [react()],
    base,
    build: {
      outDir: 'app-dist',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@interfaces': fileURLToPath(new URL('./src/interfaces', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
    },
  };
})
