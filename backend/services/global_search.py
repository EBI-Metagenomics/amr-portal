"""Global search helpers using the global_search table and DuckDB FTS index."""

from __future__ import annotations

import logging
from typing import Any

import duckdb
from fastapi import HTTPException

from core.constants import MIN_SEARCH_PREFIX_LENGTH
from core.sql.global_search import (
    GLOBAL_SEARCH_SCHEMAS_SQL,
    GLOBAL_SEARCH_TABLES_SQL,
    SEARCH_COUNTS_FROM_MATERIALIZED_SQL,
    SEARCH_COUNTS_SQL,
    SEARCH_HITS_CTE,
    SEARCH_HITS_DROP_SQL,
    SEARCH_HITS_MATERIALIZE_SQL,
    SEARCH_ROWID_PREDICATE,
    SEARCH_ROWID_PREDICATE_MATERIALIZED,
)

logger = logging.getLogger(__name__)

_global_search_available: bool | None = None


def normalize_search_query(raw: str | None) -> str | None:
    """Return a normalized prefix for search, or None if inactive."""
    if raw is None:
        return None
    prefix = raw.strip().lower()
    if len(prefix) < MIN_SEARCH_PREFIX_LENGTH:
        return None
    return prefix


def is_global_search_available(db: duckdb.DuckDBPyConnection) -> bool:
    """True when global_search and its FTS schema exist (cached per process)."""
    global _global_search_available
    if _global_search_available is not None:
        return _global_search_available
    try:
        tables = {row[0] for row in db.execute(GLOBAL_SEARCH_TABLES_SQL).fetchall()}
        if "global_search" not in tables:
            _global_search_available = False
            return False
        schemas = {row[0] for row in db.execute(GLOBAL_SEARCH_SCHEMAS_SQL).fetchall()}
        _global_search_available = "fts_main_global_search" in schemas
        return _global_search_available
    except Exception:
        _global_search_available = False
        return False


def set_global_search_available(available: bool | None) -> None:
    """Seed or reset the FTS availability cache (e.g. from startup verification)."""
    global _global_search_available
    _global_search_available = available


def materialize_search_hits(db: duckdb.DuckDBPyConnection, search_prefix: str) -> None:
    """Run the FTS lookup once and store matching rowids in a temp table."""
    db.execute(SEARCH_HITS_MATERIALIZE_SQL, [search_prefix])


def clear_search_hits(db: duckdb.DuckDBPyConnection) -> None:
    """Drop the per-request search hits temp table."""
    db.execute(SEARCH_HITS_DROP_SQL)


def fetch_search_counts_from_materialized(db: duckdb.DuckDBPyConnection) -> dict[str, int]:
    """Return {source_table: search_count} from a materialized _amr_search_hits table."""
    rows = db.execute(SEARCH_COUNTS_FROM_MATERIALIZED_SQL).fetchall()
    return {str(source_table): int(count) for source_table, count in rows}


def merge_materialized_search_predicate(
    where_sql: str,
    dataset: str,
) -> tuple[str, list[Any]]:
    """Append a rowid filter using the materialized search hits temp table."""
    predicate = SEARCH_ROWID_PREDICATE_MATERIALIZED
    if where_sql:
        return f"({predicate}) AND ({where_sql})", [dataset]
    return predicate, [dataset]


def resolve_search_prefix(
    raw: str | None,
    db: duckdb.DuckDBPyConnection,
) -> str | None:
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


def search_hit_params(prefix: str, dataset: str) -> list[Any]:
    return [prefix, dataset]


def prepend_search_hits_cte(sql: str) -> str:
    return f"WITH {SEARCH_HITS_CTE} {sql}"


def merge_search_predicate(where_sql: str, search_prefix: str | None) -> str:
    if not search_prefix:
        return where_sql
    if where_sql:
        return f"({SEARCH_ROWID_PREDICATE}) AND ({where_sql})"
    return SEARCH_ROWID_PREDICATE


def compose_search_query(
    sql: str,
    params: list[Any],
    dataset: str,
    search_prefix: str | None,
) -> tuple[str, list[Any]]:
    """Prefix SQL with the search_hits CTE and prepend bind parameters."""
    if not search_prefix:
        return sql, params
    return prepend_search_hits_cte(sql), [*search_hit_params(search_prefix, dataset), *params]


def fetch_search_counts_by_dataset(
    db: duckdb.DuckDBPyConnection,
    search_prefix: str,
) -> dict[str, int]:
    """Return {source_table: search_count} across all datasets."""
    rows = db.execute(SEARCH_COUNTS_SQL, [search_prefix]).fetchall()
    return {str(source_table): int(count) for source_table, count in rows}


def require_filters_or_search(
    selected_filters: list[Any],
    search_prefix: str | None,
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
