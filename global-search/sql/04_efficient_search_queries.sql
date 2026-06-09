-- =============================================================================
-- Efficient global_search FTS queries (use these instead of match_bm25 in WHERE)
-- =============================================================================
--
-- WHY NOT match_bm25 ON THE FULL TABLE?
--
--   SELECT ... FROM global_search g
--   WHERE fts_main_global_search.match_bm25(g.rowid, 'tetA') IS NOT NULL
--
-- This pattern scans every row in global_search and, for each row, evaluates
-- whether rowid is in the top-1000 BM25 matches. On multi-million-row tables
-- this spills tens of GB to disk and often hits max_temp_directory_size.
--
-- Also, match_bm25 is defined with an internal LIMIT 1000, so it cannot return
-- accurate total search counts for the RESULT TYPE radio buttons.
--
-- DEFAULT SEARCH MODE: PREFIX LOOKUP ON dict.term
--
-- Users typically type partial accessions (ERZ254), gene fragments (tet), or
-- antibiotic prefixes (amik), not full indexed tokens. Indexed values such as
-- assembly_ID are whole tokens (erz25458162), so use:
--
--   dict.term LIKE lower(user_query) || '%'
--
-- Enforce a minimum query length (e.g. 3) in application code before searching.
-- Prefix matches can hit tokens from any indexed field, not only assembly_ID.
--
-- Replace example prefixes / source_table filters / LIMIT as needed.
-- Bind ? placeholders when used from the API: (1) query prefix, (2) source_table,
-- (3) limit, (4) offset.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Result-type search counts (RESULT TYPE radio buttons)
--    Example: partial assembly accession ERZ254 -> ERZ25458162
-- ---------------------------------------------------------------------------
WITH search_query AS (
    SELECT lower(trim('ERZ254')) AS prefix
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
SELECT
    g.source_table,
    COUNT(*) AS search_count
FROM matching_docids AS md
INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
INNER JOIN global_search AS g ON g.rowid = docs.name
GROUP BY g.source_table
ORDER BY g.source_table;

-- ---------------------------------------------------------------------------
-- 2. BM25-ranked hits for one result type (pagination-friendly)
--    Example: partial gene prefix tet -> tetA, tetB, ...
--    Parameters: (1) query prefix, (2) source_table, (3) limit, (4) offset
-- ---------------------------------------------------------------------------
WITH search_query AS (
    SELECT lower(trim('tet')) AS prefix
),
qtermids AS (
    SELECT dict.termid
    FROM fts_main_global_search.dict AS dict, search_query AS q
    WHERE length(q.prefix) >= 3
      AND dict.term LIKE q.prefix || '%'
),
qterms AS (
    SELECT terms.termid, terms.docid
    FROM fts_main_global_search.terms AS terms
    WHERE terms.termid IN (SELECT termid FROM qtermids)
),
subscores AS (
    SELECT
        docs.docid,
        docs.len,
        term_tf.termid,
        term_tf.tf,
        dict.df,
        (
            log(
                ((SELECT num_docs FROM fts_main_global_search.stats) - dict.df + 0.5)
                / (dict.df + 0.5)
            )
            * (
                (term_tf.tf * (1.2 + 1))
                / (
                    term_tf.tf
                    + 1.2 * (
                        1 - 0.75
                        + 0.75 * (docs.len / (SELECT avgdl FROM fts_main_global_search.stats))
                    )
                )
            )
        ) AS subscore
    FROM (
        SELECT termid, docid, COUNT(*) AS tf
        FROM qterms
        GROUP BY docid, termid
    ) AS term_tf
    INNER JOIN (
        SELECT docid FROM qterms GROUP BY docid
    ) AS cdocs ON term_tf.docid = cdocs.docid
    INNER JOIN fts_main_global_search.docs AS docs ON term_tf.docid = docs.docid
    INNER JOIN fts_main_global_search.dict AS dict ON term_tf.termid = dict.termid
),
scores AS (
    SELECT docid, sum(subscore) AS score
    FROM subscores
    GROUP BY docid
)
SELECT
    g.source_table,
    g.source_rowid,
    g.BioSample_ID,
    g.assembly_ID,
    g.gene_symbol,
    g.antibiotic_name,
    scores.score
FROM scores
INNER JOIN fts_main_global_search.docs AS docs ON scores.docid = docs.docid
INNER JOIN global_search AS g ON g.rowid = docs.name
WHERE g.source_table = 'genotype'
ORDER BY scores.score DESC
LIMIT 100 OFFSET 0;

-- ---------------------------------------------------------------------------
-- 3. Prefix hits joined back to a source table (phenotype example)
--    Example: partial antibiotic amik -> amikacin
-- ---------------------------------------------------------------------------
WITH search_query AS (
    SELECT lower(trim('amik')) AS prefix
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
),
hits AS (
    SELECT g.source_rowid
    FROM matching_docids AS md
    INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
    INNER JOIN global_search AS g ON g.rowid = docs.name
    WHERE g.source_table = 'phenotype'
)
SELECT
    p.antibiotic_name,
    p.resistance_phenotype,
    p.BioSample_ID,
    p.assembly_ID
FROM hits AS h
INNER JOIN phenotype AS p ON p.rowid = h.source_rowid
ORDER BY p.antibiotic_name, p.BioSample_ID
LIMIT 20;

-- ---------------------------------------------------------------------------
-- 4. Search-scoped facet count (antibiotic) for phenotype view
--    Example: tet prefix scoped to phenotype rows that match search
-- ---------------------------------------------------------------------------
WITH search_query AS (
    SELECT lower(trim('tet')) AS prefix
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
),
hits AS (
    SELECT g.source_rowid
    FROM matching_docids AS md
    INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
    INNER JOIN global_search AS g ON g.rowid = docs.name
    WHERE g.source_table = 'phenotype'
)
SELECT
    p.antibiotic_name AS value,
    COUNT(*) AS count
FROM hits AS h
INNER JOIN phenotype AS p ON p.rowid = h.source_rowid
WHERE p.antibiotic_name IS NOT NULL
GROUP BY p.antibiotic_name
ORDER BY LOWER(CAST(p.antibiotic_name AS VARCHAR))
LIMIT 10;

-- ---------------------------------------------------------------------------
-- 5. Diagnostics: preview prefix matches in the FTS dictionary
-- ---------------------------------------------------------------------------
SELECT dict.term, dict.df
FROM fts_main_global_search.dict AS dict
WHERE dict.term LIKE lower(trim('ERZ254')) || '%'
ORDER BY dict.term
LIMIT 50;

-- Compare with exact token (usually too strict for user-typed partial queries):
-- SELECT dict.term, dict.df
-- FROM fts_main_global_search.dict AS dict
-- WHERE dict.term = lower(trim('tetA'));

-- ---------------------------------------------------------------------------
-- 6. OPTIONAL: exact multi-token match (use when query contains spaces)
-- ---------------------------------------------------------------------------
-- tokenize() returns VARCHAR[] — unnest before joining to dict.term.
--
-- WITH search_query AS (
--     SELECT lower(trim('tetA amikacin')) AS raw_query
-- ),
-- tokens AS (
--     SELECT DISTINCT t
--     FROM (
--         SELECT unnest(fts_main_global_search.tokenize(search_query.raw_query)) AS t
--         FROM search_query
--     )
--     WHERE t IS NOT NULL AND t != ''
-- ),
-- qtermids AS (
--     SELECT dict.termid
--     FROM fts_main_global_search.dict AS dict, tokens
--     WHERE dict.term = tokens.t
-- ),
-- matching_docids AS (
--     SELECT terms.docid
--     FROM fts_main_global_search.terms AS terms
--     WHERE terms.termid IN (SELECT termid FROM qtermids)
--     GROUP BY terms.docid
--     HAVING COUNT(DISTINCT terms.termid) = (SELECT COUNT(*) FROM tokens)
-- )
-- SELECT g.source_table, COUNT(*) AS search_count
-- FROM matching_docids AS md
-- INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
-- INNER JOIN global_search AS g ON g.rowid = docs.name
-- GROUP BY g.source_table;
