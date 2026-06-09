-- =============================================================================
-- global_search FTS index (DuckDB full-text search extension)
-- =============================================================================
--
-- Purpose
--   Creates a BM25 full-text index on global_search for portal global search.
--
-- Prerequisites
--   - DuckDB FTS extension loaded (INSTALL fts; LOAD fts;)
--   - global_search table exists (run 01_create_table.sql first)
--
-- Tokenisation settings
--   stemmer   = 'none'  : preserve gene symbols and accession tokens (e.g. tetA)
--   stopwords = 'none'  : do not drop short tokens that may be accessions
--   ignore    = '[^a-zA-Z0-9_\\-\\.]+' : keep alphanumerics, underscore, hyphen, dot
--   lower     = 1       : case-insensitive search
--   overwrite = 1       : replace existing index on re-run
--
-- Idempotency
--   Safe to re-run with overwrite = 1.
--
-- Note
--   FTS indexes do not auto-update when source tables change. Re-run both
--   01_create_table.sql and this file after any phenotype/genotype/merged reload.
-- =============================================================================

PRAGMA create_fts_index(
    'global_search',
    'rowid',
    'BioSample_ID',
    'SRA_accession',
    'assembly_ID',
    'id',
    'gene_symbol',
    'amr_element_symbol',
    'antibiotic_name',
    stemmer = 'none',
    stopwords = 'none',
    ignore = '[^a-zA-Z0-9_\\-\\.]+',
    lower = 1,
    overwrite = 1
);
