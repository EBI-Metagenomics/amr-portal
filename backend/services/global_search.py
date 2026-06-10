"""Global search helpers using the global_search table and DuckDB FTS index."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import duckdb
from fastapi import HTTPException

logger = logging.getLogger(__name__)

MIN_SEARCH_PREFIX_LENGTH = 3

# Params per query using SEARCH_HITS_CTE: (1) prefix, (2) source_table
SEARCH_HITS_CTE = """
search_query AS (
    SELECT ? AS prefix
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
search_hits AS (
    SELECT g.source_rowid AS hit_rowid
    FROM matching_docids AS md
    INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
    INNER JOIN global_search AS g ON g.rowid = docs.name
    WHERE g.source_table = ?
)
""".strip()

SEARCH_COUNTS_SQL = """
WITH search_query AS (
    SELECT ? AS prefix
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
GROUP BY g.source_table
""".strip()

SEARCH_ROWID_PREDICATE = "rowid IN (SELECT hit_rowid FROM search_hits)"


def normalize_search_query(raw: Optional[str]) -> Optional[str]:
    """Return a normalized prefix for search, or None if inactive."""
    if raw is None:
        return None
    prefix = raw.strip().lower()
    if len(prefix) < MIN_SEARCH_PREFIX_LENGTH:
        return None
    return prefix


def is_global_search_available(db: duckdb.DuckDBPyConnection) -> bool:
    """True when global_search and its FTS schema exist."""
    try:
        tables = {
            row[0]
            for row in db.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'main'
                  AND table_type = 'BASE TABLE'
                """
            ).fetchall()
        }
        if "global_search" not in tables:
            return False
        schemas = {
            row[0]
            for row in db.execute(
                "SELECT schema_name FROM information_schema.schemata"
            ).fetchall()
        }
        return "fts_main_global_search" in schemas
    except Exception:
        return False


def resolve_search_prefix(
    raw: Optional[str],
    db: duckdb.DuckDBPyConnection,
) -> Optional[str]:
    """Normalize search input and verify FTS infrastructure is present."""
    prefix = normalize_search_query(raw)
    if not prefix:
        return None
    if not is_global_search_available(db):
        logger.warning(
            "search_query provided but global_search FTS is unavailable; ignoring search"
        )
        return None
    return prefix


def search_hit_params(prefix: str, dataset: str) -> List[Any]:
    return [prefix, dataset]


def prepend_search_hits_cte(sql: str) -> str:
    return f"WITH {SEARCH_HITS_CTE} {sql}"


def merge_search_predicate(where_sql: str, search_prefix: Optional[str]) -> str:
    if not search_prefix:
        return where_sql
    if where_sql:
        return f"({SEARCH_ROWID_PREDICATE}) AND ({where_sql})"
    return SEARCH_ROWID_PREDICATE


def compose_search_query(
    sql: str,
    params: List[Any],
    dataset: str,
    search_prefix: Optional[str],
) -> Tuple[str, List[Any]]:
    """Prefix SQL with the search_hits CTE and prepend bind parameters."""
    if not search_prefix:
        return sql, params
    return prepend_search_hits_cte(sql), [*search_hit_params(search_prefix, dataset), *params]


def fetch_search_counts_by_dataset(
    db: duckdb.DuckDBPyConnection,
    search_prefix: str,
) -> Dict[str, int]:
    """Return {source_table: search_count} across all datasets."""
    rows = db.execute(SEARCH_COUNTS_SQL, [search_prefix]).fetchall()
    return {str(source_table): int(count) for source_table, count in rows}


def require_filters_or_search(
    selected_filters: List[Any],
    search_prefix: Optional[str],
) -> None:
    """Browse mode needs facets; global search mode needs only search_query + view_id."""
    if search_prefix:
        return
    if not selected_filters:
        raise HTTPException(
            status_code=400,
            detail=(
                "Select at least one facet filter to browse data, or provide "
                f"search_query (minimum {MIN_SEARCH_PREFIX_LENGTH} characters) for global search."
            ),
        )
