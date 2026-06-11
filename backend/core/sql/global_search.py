"""Global search FTS queries."""

from core.constants import MIN_SEARCH_PREFIX_LENGTH

# Params per query using SEARCH_HITS_CTE: (1) prefix, (2) source_table
SEARCH_HITS_CTE = f"""
search_query AS (
    SELECT ? AS prefix
),
qtermids AS (
    SELECT dict.termid
    FROM fts_main_global_search.dict AS dict, search_query AS q
    WHERE length(q.prefix) >= {MIN_SEARCH_PREFIX_LENGTH}
      AND dict.term LIKE q.prefix || '%'
),
matching_docids AS (
    SELECT DISTINCT terms.docid
    FROM fts_main_global_search.terms AS terms
    WHERE terms.termid IN (SELECT termid FROM qtermids)
),
search_hits AS (
    SELECT g.source_rowid AS hit_rowid
    FROM matching_docids AS md
    INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
    INNER JOIN global_search AS g ON g.rowid = docs.name
    WHERE g.source_table = ?
)
""".strip()

SEARCH_COUNTS_SQL = f"""
WITH search_query AS (
    SELECT ? AS prefix
),
qtermids AS (
    SELECT dict.termid
    FROM fts_main_global_search.dict AS dict, search_query AS q
    WHERE length(q.prefix) >= {MIN_SEARCH_PREFIX_LENGTH}
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
GROUP BY g.source_table
""".strip()

SEARCH_ROWID_PREDICATE = "rowid IN (SELECT hit_rowid FROM search_hits)"

GLOBAL_SEARCH_TABLES_SQL = """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'main'
      AND table_type = 'BASE TABLE'
""".strip()

GLOBAL_SEARCH_SCHEMAS_SQL = "SELECT schema_name FROM information_schema.schemata"
