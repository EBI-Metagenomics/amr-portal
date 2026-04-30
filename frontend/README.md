# AMR React Frontend

React frontend for the AMR portal migration, following METT portal conventions:
- Vite + React + TypeScript
- React Router for app routes
- React Query for server-state fetching
- service-layer API client with typed interfaces

## Local development

1. Install dependencies:
   - `npm install` (from `frontend/`, or `npm install --prefix frontend` from repo root)
2. Copy env: `cp .env.example .env` and edit **`VITE_APP_BASE`** if you want a different URL prefix (default is **`/amr/data/`**).
3. Start dev server:
   - `npm run dev` from `frontend/`, or from repo root: `npm run --prefix frontend dev`

The dev URL path comes from **`VITE_APP_BASE`** (Vite `base` + React Router basename). If you still see `/amr-react/`, check for an old `VITE_APP_BASE` in a **repo-root** `.env` — env is read from `frontend/` only.

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

- `VITE_API_BASE_URL` - backend API base (default `/amr/api`). In Docker/Kubernetes runtime, this can be overridden via container env var `VITE_API_BASE_URL` without rebuilding the image.
- `VITE_APP_BASE` - Vite asset base and React Router basename (default in `vite.config.ts` is `{VITE_PORTAL_PREFIX}/data/`, e.g. `/amr/data/`)

## Build

- `npm run typecheck`
- `npm run build`

## Container build

Dockerfile lives at `frontend/Dockerfile` and builds static assets with Node, then serves them from Nginx on port `8000`.

## Kubernetes test deployment

Side-by-side manifests are under `k8s/frontend-react/` and expose the SPA on **`/amr/data/…`** (ingress rewrites to `/data/…` inside nginx). Use this only when the merged `k8s/frontend` ingress is not handling `/amr` for the same host, or ensure both backends serve the same image so `/amr/data` routing stays consistent.
