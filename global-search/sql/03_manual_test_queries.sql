-- =============================================================================
-- Manual test queries for global_search + FTS
-- =============================================================================
--
-- Run after 01_create_table.sql and 02_create_fts_index.sql.
-- Replace the example search terms as needed.
--
-- Usage (duckdb CLI, from repo root):
--   duckdb /path/to/amr_release.duckdb
--   .read global-search/sql/03_manual_test_queries.sql
-- =============================================================================

-- Row counts per source table
SELECT source_table, COUNT(*) AS row_count
FROM global_search
GROUP BY source_table
ORDER BY source_table;

-- ---------------------------------------------------------------------------
-- Result-type search counts (maps to portal RESULT TYPE radio buttons)
-- Replace 'tetA' with your test query.
-- ---------------------------------------------------------------------------
WITH query AS (
    SELECT lower('tetA') AS q
)
SELECT
    source_table,
    COUNT(*) AS search_count
FROM global_search g, query q
WHERE fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
GROUP BY source_table
ORDER BY source_table;

-- ---------------------------------------------------------------------------
-- Top hits across all source tables
-- ---------------------------------------------------------------------------
WITH query AS (
    SELECT lower('tetA') AS q
)
SELECT
    source_table,
    source_rowid,
    BioSample_ID,
    assembly_ID,
    gene_symbol,
    antibiotic_name,
    fts_main_global_search.match_bm25(g.rowid, q.q) AS score
FROM global_search g, query q
WHERE fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
ORDER BY score DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- Phenotype results: search + join back to source table
-- ---------------------------------------------------------------------------
WITH query AS (
    SELECT lower('amikacin') AS q
),
hits AS (
    SELECT
        source_rowid,
        fts_main_global_search.match_bm25(g.rowid, q.q) AS score
    FROM global_search g, query q
    WHERE g.source_table = 'phenotype'
      AND fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
)
SELECT
    p.antibiotic_name,
    p.resistance_phenotype,
    p.BioSample_ID,
    h.score
FROM hits h
JOIN phenotype p ON p.rowid = h.source_rowid
ORDER BY h.score DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- Search-scoped facet count (antibiotic) for phenotype view
-- ---------------------------------------------------------------------------
WITH query AS (
    SELECT lower('tetA') AS q
),
hits AS (
    SELECT source_rowid
    FROM global_search g, query q
    WHERE g.source_table = 'phenotype'
      AND fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
)
SELECT
    p.antibiotic_name AS value,
    COUNT(*) AS count
FROM hits h
JOIN phenotype p ON p.rowid = h.source_rowid
WHERE p.antibiotic_name IS NOT NULL
GROUP BY p.antibiotic_name
ORDER BY LOWER(CAST(p.antibiotic_name AS VARCHAR))
LIMIT 10;
