# AMR portal global search

Builds the `global_search` DuckDB table and full-text search (FTS) index used by the AMR portal global search feature.

This package is separate from `scripts/etl/`. Run it after an AMR DuckDB release is created or whenever source tables are updated.

## What gets created

| Object | Description |
|--------|-------------|
| `global_search` | Materialised search projection: one row per source record with `(source_table, source_rowid)` join keys |
| `fts_main_global_search` | FTS schema created by `PRAGMA create_fts_index` |

## Layout

```
global-search/
  README.md
  pyproject.toml
  rebuild_global_search.py      # CLI entry point
  amr_global_search/
    build.py                    # Python API
  sql/
    00_optional_session_settings.sql  # PRAGMAs if spill / OOM errors
    01_create_table.sql               # Rebuild global_search table
    02_create_fts_index.sql           # Create / replace BM25 FTS index
    03_manual_test_queries.sql        # Smoke tests (efficient patterns)
    04_efficient_search_queries.sql   # Documented search/count SQL patterns
  tests/
    test_build.py
```

## When to re-run

Re-run **both** `01_create_table.sql` and `02_create_fts_index.sql` whenever:

- A new AMR release is loaded into DuckDB
- Source tables (`phenotype`, `genotype`, `pheno_geno_merged`) are updated in place
- Search columns or tokenisation settings change

`01` changes `global_search.rowid` values, so the FTS index must always be rebuilt immediately after.

## Deploy to the cluster (local rebuild, copy to PVC)

The API image only **loads** the FTS extension at runtime; the `global_search` table
and FTS index must already exist **inside** the DuckDB file. Build them locally, then
copy the finished file to the PVC the API mounts.

### 1. Obtain the release DuckDB file

Download or copy the current `amr_RELEASE.duckdb` from FTP, ETL output, or the
cluster (if you need to re-index an existing file).

### 2. Rebuild locally

```bash
cd global-search
uv sync
uv run python rebuild_global_search.py --db-path /path/to/amr_RELEASE.duckdb
```

DuckDB will `INSTALL`/`LOAD` the FTS extension into your local user cache on first
run. No container image is required for this step.

### 3. Smoke test (optional)

```bash
duckdb /path/to/amr_RELEASE.duckdb
```

```sql
LOAD fts;
.read global-search/sql/03_manual_test_queries.sql
```

Or run the package tests: `uv sync --group dev && uv run pytest tests/ -v`

### 4. Copy to the API PVC

Scale the backend deployment to zero (or ensure no pod has the file open), then copy
the file to the mount path your API uses (`DUCKDB_PATH`, often `/usr/data/portal.duckdb`).

**Via a temporary debug pod** (adjust namespace, PVC name, and paths):

```bash
kubectl run duckdb-upload --rm -it --restart=Never \
  --image=busybox \
  --overrides='{"spec":{"containers":[{"name":"duckdb-upload","image":"busybox","command":["sh"],"stdin":true,"tty":true,"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"YOUR_PVC"}}]}}'

# In another terminal, while the pod is running:
kubectl cp /path/to/amr_RELEASE.duckdb YOUR_NAMESPACE/duckdb-upload:/data/portal.duckdb
```

**Or** `kubectl cp` directly to a backend pod if your cluster allows it and the pod
is stopped or the file is not locked.

### 5. Restart the API and verify

Restart backend pods so they pick up the new file. On startup the API logs whether
FTS is loaded and `global_search` / `fts_main_global_search` are present.

## Automation

### Rebuild on an existing database

```bash
cd global-search
uv sync
uv run python rebuild_global_search.py --db-path /path/to/amr_RELEASE.duckdb
```

### Python API

```python
import duckdb
from amr_global_search import build_global_search

conn = duckdb.connect("/path/to/amr_RELEASE.duckdb")
build_global_search(conn)
conn.close()
```

### After ETL

If you use `scripts/etl/` to build a new DuckDB file, run `rebuild_global_search.py` once the release database exists. The ETL pipeline does not invoke this package automatically.

## Manual run (duckdb CLI)

From the repository root:

```bash
duckdb /path/to/amr_RELEASE.duckdb
```

```sql
INSTALL fts;
LOAD fts;

.read global-search/sql/01_create_table.sql
.read global-search/sql/02_create_fts_index.sql
```

Then optionally:

```sql
.read global-search/sql/03_manual_test_queries.sql
```

## Searchable columns

| Concept | Column(s) |
|---------|-----------|
| Sample accession | `BioSample_ID` |
| Genome accession | `assembly_ID` |
| SRA accession | `SRA_accession` |
| Gene / AMR locus | `id`, `gene_symbol`, `amr_element_symbol` |
| Antibiotic name | `antibiotic_name` |

## Tests

```bash
cd global-search
uv sync --group dev
uv run pytest tests/ -v
```

## Query patterns (important)

**Do not** filter the full `global_search` table with `match_bm25` in `WHERE`:

```sql
-- AVOID on large tables — full scan + heavy spill, often hits max_temp_directory_size
FROM global_search g
WHERE fts_main_global_search.match_bm25(g.rowid, 'tetA') IS NOT NULL
```

Reasons:

1. DuckDB evaluates this against **every** `global_search` row on large releases.
2. `match_bm25` is implemented as `rowid IN (...)` with an internal **`LIMIT 1000`**, so it cannot produce accurate RESULT TYPE counts.

**Instead**, start from the FTS inverted index (`dict` → `terms` → `docs`), then join to `global_search`. See `sql/04_efficient_search_queries.sql`.

### Default: prefix search (partial user input)

Users usually type prefixes (`ERZ254`, `tet`, `amik`), not full indexed tokens (`erz25458162`). Use prefix lookup on `dict.term`:

```sql
WITH search_query AS (
    SELECT lower(trim(?)) AS prefix
),
qtermids AS (
    SELECT dict.termid
    FROM fts_main_global_search.dict AS dict, search_query AS q
    WHERE length(q.prefix) >= 3
      AND dict.term LIKE q.prefix || '%'
),
matching_docids AS (
    SELECT DISTINCT terms.docid
    FROM fts_main_global_search.terms AS terms
    WHERE terms.termid IN (SELECT termid FROM qtermids)
)
SELECT g.source_table, COUNT(*) AS search_count
FROM matching_docids AS md
INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
INNER JOIN global_search AS g ON g.rowid = docs.name
GROUP BY g.source_table;
```
