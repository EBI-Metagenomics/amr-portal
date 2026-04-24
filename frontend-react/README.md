# AMR React Frontend

React frontend for the AMR portal migration, following METT portal conventions:
- Vite + React + TypeScript
- React Router for app routes
- React Query for server-state fetching
- service-layer API client with typed interfaces

## Local development

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

- `VITE_API_BASE_URL` - backend API base (default `/amr/api`)
- `VITE_APP_BASE` - app base path used by Vite and router (for example `/amr-react/`)

## Build

- `npm run typecheck`
- `npm run build`

## Container build

Dockerfile lives at `frontend-react/Dockerfile` and builds static assets with Node, then serves them from Nginx on port `8000`.

## Kubernetes test deployment

Side-by-side manifests are under `k8s/frontend-react/` and expose the app on:
- `/amr-react(/|$)(.*)` via ingress
