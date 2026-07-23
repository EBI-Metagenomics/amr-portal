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
--   lower     = 1       : case-insensitive search
--   overwrite = 1       : replace existing index on re-run
--
--   ignore = '[^a-zA-Z0-9_.()]+'
--     Characters matching this regex are separators (not kept in tokens).
--     Kept in tokens: letters, digits, underscore, dot, parentheses.
--     Split on purpose: spaces, hyphens, and other punctuation.
--
--     Why split on hyphen:
--       Antibiotic / compound names such as "beta-lactam antibiotic" and
--       "trimethoprim-sulfamethoxazole" are searchable as AND of parts, whether
--       the user types a hyphen or a space. The API query path must use the
--       same tokenizer: fts_main_global_search.tokenize(query).
--
--     Why keep dot / underscore / parentheses:
--       Accessions (GCA_000013465.1) and symbols like mph(A) stay single tokens.
--
-- Idempotency
--   Safe to re-run with overwrite = 1.
--
-- Note
--   taxon_id is intentionally excluded — the API uses exact equality at query time.
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
    'organism',
    'genus',
    'species',
    stemmer = 'none',
    stopwords = 'none',
    ignore = '[^a-zA-Z0-9_.()]+',
    lower = 1,
    overwrite = 1
);
