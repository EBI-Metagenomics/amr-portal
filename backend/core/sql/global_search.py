"""Global search FTS queries."""

from core.constants import MIN_SEARCH_PREFIX_LENGTH

_MIN_LEN = MIN_SEARCH_PREFIX_LENGTH

_SEARCH_QUERY_CTE = """
search_query AS (
    SELECT ? AS prefix
)
""".strip()

# Split the query into tokens (spaces), prefix-match each token against
# dict.term, and keep docs that match every token (AND).
# Single-token queries behave as before (prefix LIKE). Multi-word phrases such
# as "Staphylococcus aureus" or "aminocoumarin antibiotic" need this AND logic.
_QTERMIDS_AND_MATCHING_DOCIDS_CTE = f"""
search_tokens AS (
    SELECT DISTINCT token
    FROM (
        SELECT trim(unnest(string_split(q.prefix, ' '))) AS token
        FROM search_query AS q
    )
    WHERE token IS NOT NULL
      AND token != ''
      AND length(token) >= {_MIN_LEN}
),
qtermids AS (
    SELECT dict.termid, tokens.token
    FROM fts_main_global_search.dict AS dict
    CROSS JOIN search_tokens AS tokens
    WHERE dict.term LIKE tokens.token || '%'
),
matching_docids AS (
    SELECT terms.docid
    FROM fts_main_global_search.terms AS terms
    INNER JOIN qtermids ON terms.termid = qtermids.termid
    GROUP BY terms.docid
    HAVING COUNT(DISTINCT qtermids.token) = (SELECT COUNT(*) FROM search_tokens)
)
""".strip()

_FTS_HITS_SELECT = """
SELECT g.source_rowid AS hit_rowid, g.source_table AS source_table
FROM matching_docids AS md
INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
INNER JOIN global_search AS g ON g.rowid = docs.name
""".strip()

_TAXON_HITS_SELECT = f"""
SELECT g.source_rowid AS hit_rowid, g.source_table AS source_table
FROM global_search AS g, search_query AS q
WHERE length(q.prefix) >= {_MIN_LEN}
  AND regexp_full_match(q.prefix, '[0-9]+')
  AND g.taxon_id = q.prefix
""".strip()

# Params per query using SEARCH_HITS_CTE: (1) prefix, (2) source_table, (3) source_table
SEARCH_HITS_CTE = f"""
{_SEARCH_QUERY_CTE},
{_QTERMIDS_AND_MATCHING_DOCIDS_CTE},
search_hits AS (
    SELECT hit_rowid FROM (
        {_FTS_HITS_SELECT}
        WHERE g.source_table = ?
        UNION
        {_TAXON_HITS_SELECT}
        AND g.source_table = ?
    )
)
""".strip()

SEARCH_COUNTS_SQL = f"""
WITH {_SEARCH_QUERY_CTE},
{_QTERMIDS_AND_MATCHING_DOCIDS_CTE},
fts_hits AS (
    {_FTS_HITS_SELECT}
),
taxon_hits AS (
    {_TAXON_HITS_SELECT}
),
all_hits AS (
    SELECT hit_rowid, source_table FROM fts_hits
    UNION
    SELECT hit_rowid, source_table FROM taxon_hits
)
SELECT source_table, COUNT(*) AS search_count
FROM all_hits
GROUP BY source_table
""".strip()

SEARCH_ROWID_PREDICATE = "rowid IN (SELECT hit_rowid FROM search_hits)"

# Materialize FTS + taxon exact hits once per request; facet queries reuse this temp table.
SEARCH_HITS_MATERIALIZE_SQL = f"""
CREATE OR REPLACE TEMP TABLE _amr_search_hits AS
WITH {_SEARCH_QUERY_CTE},
{_QTERMIDS_AND_MATCHING_DOCIDS_CTE},
fts_hits AS (
    {_FTS_HITS_SELECT}
),
taxon_hits AS (
    {_TAXON_HITS_SELECT}
)
SELECT hit_rowid, source_table FROM fts_hits
UNION
SELECT hit_rowid, source_table FROM taxon_hits
""".strip()

SEARCH_HITS_DROP_SQL = "DROP TABLE IF EXISTS _amr_search_hits"

SEARCH_ROWID_PREDICATE_MATERIALIZED = (
    "rowid IN (SELECT hit_rowid FROM _amr_search_hits WHERE source_table = ?)"
)

SEARCH_COUNTS_FROM_MATERIALIZED_SQL = """
SELECT source_table, COUNT(*) AS search_count
FROM _amr_search_hits
GROUP BY source_table
""".strip()

GLOBAL_SEARCH_TABLES_SQL = """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'main'
      AND table_type = 'BASE TABLE'
""".strip()

GLOBAL_SEARCH_SCHEMAS_SQL = "SELECT schema_name FROM information_schema.schemata"
