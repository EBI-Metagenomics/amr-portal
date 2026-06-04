# Backend Architecture and Walkthrough

## Purpose
This document gives a complete technical walkthrough of the backend service in this repository so you can present it clearly to engineering or product stakeholders.

## 1) System at a Glance
- **Architecture style:** single FastAPI service with a modular code layout.
- **Primary data store:** read-only DuckDB file (mounted at runtime via `DUCKDB_PATH`).
- **API style:** REST endpoints under `/api`.
- **Docs surface:** custom Swagger UI shell under `/docs`.
- **Deployment target:** Kubernetes (dev and prod overlays under `k8s/`).

## 2) Tech Stack
- Python 3.13
- FastAPI / Starlette / Uvicorn
- Pydantic (request/response contracts)
- DuckDB (analytics and record retrieval)
- Gunicorn listed for process management dependency support

Dependency definitions: `backend/pyproject.toml` (runtime and optional dev extras), lockfile `backend/uv.lock`; production image installs with `uv sync --frozen` in `backend/Dockerfile`.

## 3) Repository Areas (Backend-Focused)
- `backend/main.py`: app creation, middleware wiring, route registration, static docs mounting.
- `backend/api/endpoints.py`: all REST endpoints.
- `backend/core/config.py`: environment config and startup validation.
- `backend/core/database.py`: DuckDB connection dependency management.
- `backend/core/filters_config_parser.py`: builds filter/view metadata payload.
- `backend/services/filters.py`: core query/filter/facet/download logic.
- `backend/services/release.py`: release metadata retrieval.
- `backend/models/`: all Pydantic request/response schemas.
- `backend/static/ninja/`: Swagger UI custom assets.
- `backend/tests/`: backend unit/integration-style tests.

## 4) Startup and Runtime Flow
1. Process starts with Uvicorn using `backend/main.py`.
2. `get_settings()` loads env variables and validates `DUCKDB_PATH`.
3. FastAPI app is built with title/version metadata.
4. Middleware is attached:
   - CORS middleware
   - GZip middleware
5. Static docs assets are mounted.
6. API router is included with `/api` prefix.
7. `/docs` route serves a custom themed Swagger shell.

## 5) API Surface Overview
All endpoints are currently centralized in `backend/api/endpoints.py`.

- `GET /api/filters-config`
  - Returns available categories, filters, views, and default selections.
- `POST /api/amr-records`
  - Executes filtered/paginated AMR record retrieval.
- `POST /api/amr-facets`
  - Computes facet options and counts for current filter state.
- `POST /api/amr-records/download`
  - Returns filtered export as CSV or JSON; supports page/all scopes.
- `GET /api/amr-records/download`
  - Alternate download path using base64-encoded payload input.
- `GET /api/health`
  - Service liveness endpoint.
- `GET /api/release`
  - Returns backend release metadata from DuckDB.

## 6) Core Domain Logic
The operational heart of the service is `backend/services/filters.py`.

Main responsibilities:
- Resolve selected `view_id` into physical dataset/table context.
- Validate filter/sort/view inputs against expected schema.
- Build SQL `WHERE` fragments from selected filters.
- Apply pagination and sorting.
- Return normalized data payload with metadata.
- Compute facet counts for filter UI behavior.
- Stream large downloads without loading the full result set into memory.

## 7) Detailed Request Lifecycles

### A) Filters Configuration
1. Client calls `GET /api/filters-config`.
2. Endpoint calls `fetch_filters(...)`.
3. Service delegates to `build_filters_config(...)`.
4. Parser reads metadata tables (`filter`, `column_definition`, `view`, etc.).
5. Response is shaped into categories/views/filters model.

### B) Record Search
1. Client posts filter payload to `POST /api/amr-records`.
2. Service validates the requested `view_id`.
3. Dataset and view columns are resolved from metadata.
4. SQL query context is built (`WHERE`, sort, limit, offset).
5. Count query and paged query run against DuckDB.
6. Rows are normalized and returned with paging metadata.

### C) Facet Refresh
1. Client posts active filter state to `POST /api/amr-facets`.
2. Service computes eligible facet fields per view.
3. Grouped SQL computes value buckets and counts.
4. Optional facet search term narrows candidate options.
5. Response returns facet option pages with selection state.

### D) Data Download
1. Client requests download with format + scope.
2. If `scope=page`, service serializes currently paged records.
3. If `scope=all`, service streams full query result in chunks.
4. CSV/JSON is returned via streaming response.

## 8) Data Layer and Schema Dependencies
- Backend does not use an ORM.
- Querying is direct SQL against DuckDB.
- Data model relies on metadata-driven tables/views such as:
  - `dataset`
  - `view`
  - `view_column`
  - `filter`
  - `column_definition`
  - `release`
  - `view_categories`

Schema and ETL context also appears in:
- `scripts/etl/README.md`
- `portal-static/src/assets/scripts/data-provider/database-schema.md`

## 9) Configuration and Environment
Primary backend configuration includes:
- `DUCKDB_PATH`: required; validated for existence/file type.
- `API_HOST`, `API_PORT`, `API_URL`: service networking defaults.

Kubernetes overlays set env values in:
- `k8s/dev/backend/configmap.yaml`
- `k8s/prod/backend/configmap.yaml`

## 10) Observability and Error Handling
- Explicit `HTTPException` usage for many validation/business errors.
- General fallback exception handling exists in query-heavy paths.
- Basic logger usage is present in services.
- OpenAPI docs are available via custom `/docs` page.

Current gaps:
- No centralized exception middleware strategy.
- No structured request-ID logging pattern visible.
- `sentry-sdk` dependency exists but runtime initialization is not obvious in backend runtime entrypoints.

## 11) Security Review Summary

### What is in place
- Read-only DuckDB connections.
- Pydantic input model validation.
- Restricted scope/format query param patterns for download endpoint.
- Non-root runtime posture in Kubernetes manifests.

### Key risks / watchouts
- Very permissive CORS setup.
- Dynamic SQL construction patterns need strong identifier whitelisting discipline.
- No obvious authentication/authorization guard at API layer.

## 12) Testing Posture
Tests are under `backend/tests/`:
- `test_endpoints.py`
- `test_filters.py`
- `test_serializer.py`
- `conftest.py`

Strengths:
- Core endpoint flows have baseline test coverage.

Gaps:
- Limited negative-path/security edge-case coverage.
- Limited stress/performance coverage for large download behavior.
- No visible contract snapshot tests for API shape drift.

## 13) Architecture Strengths
- Straightforward service topology (easy to reason about).
- Strong metadata-driven filtering model.
- Efficient streaming approach for large exports.
- Clear ETL/runtime separation (data prep outside runtime API path).

## 14) Improvement Opportunities (Prioritized)
1. Split `services/filters.py` into smaller focused modules (query context, facets, pagination, exports).
2. Harden dynamic SQL composition with explicit identifier allowlists/helpers.
3. Tighten CORS by environment allowlist.
4. Add optional auth layer (API key/OIDC or upstream gateway enforcement).
5. Introduce structured request logging + request correlation IDs.
6. Expand test suite for negative cases, schema contracts, and large-stream behavior.
7. Add/verify centralized error reporting integration (for example Sentry).

## 15) 10-15 Minute Walkthrough Script

### Minute 0-1: Big Picture
"This backend is a FastAPI monolith that serves metadata-driven AMR filtering over a read-only DuckDB, with a custom Swagger docs shell."

### Minute 1-3: Boot Path
- Show `backend/main.py` for app creation, middleware, and route wiring.
- Show `backend/core/config.py` for env validation and settings caching.

### Minute 3-5: API Contract Surface
- Open `backend/api/endpoints.py`.
- Explain each endpoint role and how requests map into service calls.

### Minute 5-9: Core Engine
- Open `backend/services/filters.py`.
- Walk through:
  - `view_id -> dataset` mapping,
  - filter composition,
  - pagination and sorting,
  - facet computation.

### Minute 9-11: Download and Performance
- Explain page vs all downloads.
- Highlight streaming path as key scalability behavior.

### Minute 11-13: Deployment + Data Provenance
- Show K8s backend manifests/configmaps.
- Show ETL schema references and explain metadata-driven model dependency.

### Minute 13-15: Risks and Roadmap
- Cover CORS/auth/SQL-hardening/observability/test-depth.
- End with prioritized improvement list.

## 16) Known Unknowns
- Runtime dataset size/cardinality not confirmed in this review.
- Upstream ingress/gateway controls (auth, rate limit, WAF) were not validated here.
- CI coverage metrics were not included in this pass.

