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
    01_create_table.sql         # Rebuild global_search table
    02_create_fts_index.sql     # Create / replace BM25 FTS index
    03_manual_test_queries.sql  # Optional smoke tests
  tests/
    test_build.py
```

## When to re-run

Re-run **both** `01_create_table.sql` and `02_create_fts_index.sql` whenever:

- A new AMR release is loaded into DuckDB
- Source tables (`phenotype`, `genotype`, `pheno_geno_merged`) are updated in place
- Search columns or tokenisation settings change

`01` changes `global_search.rowid` values, so the FTS index must always be rebuilt immediately after.

## Automation

### Rebuild on an existing database (recommended)

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

## Example API query pattern (for backend implementation)

```sql
WITH query AS (SELECT lower(?) AS q),
hits AS (
    SELECT source_table, source_rowid,
           fts_main_global_search.match_bm25(g.rowid, q.q) AS score
    FROM global_search g, query q
    WHERE fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
      AND g.source_table = ?   -- active view dataset, e.g. 'phenotype'
)
SELECT p.*, h.score
FROM hits h
JOIN phenotype p ON p.rowid = h.source_rowid
ORDER BY h.score DESC
LIMIT 100 OFFSET 0;
```
