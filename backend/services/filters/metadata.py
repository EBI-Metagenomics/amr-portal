"""Dataset and view metadata lookups (cached per process)."""

from __future__ import annotations

from typing import Any

import duckdb
from fastapi import HTTPException

from core.filters_config_parser import build_filters_config
from core.sql.filters import DISPLAY_COLUMNS_FOR_VIEW_SQL, VIEW_DATASET_MAP_SQL

_display_columns_cache: dict[int, Any] = {}
_table_columns_cache: dict[str, frozenset[str]] = {}
_view_dataset_map: dict[int, str] | None = None


def get_table_columns(table_name: str, db: duckdb.DuckDBPyConnection) -> set[str]:
    """Return the set of column names for the provided table (cached per process)."""
    cached = _table_columns_cache.get(table_name)
    if cached is not None:
        return set(cached)
    try:
        columns_result = db.query(f"PRAGMA table_info({table_name})").fetchdf()
        columns = frozenset(columns_result["name"].tolist())
        _table_columns_cache[table_name] = columns
        return set(columns)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get columns for table: {table_name}",
        ) from exc


def get_view_dataset_map(db: duckdb.DuckDBPyConnection) -> dict[int, str]:
    """Map view_id → dataset table name (loaded once per process)."""
    global _view_dataset_map
    if _view_dataset_map is not None:
        return _view_dataset_map
    try:
        rows = db.execute(VIEW_DATASET_MAP_SQL).fetchall()
        _view_dataset_map = {int(view_id): str(dataset_name) for view_id, dataset_name in rows}
        return _view_dataset_map
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load view dataset map: {exc}",
        ) from exc


def check_selected_filters(grouped_filters: dict, valid_columns: set[str]) -> bool:
    """Return True when every requested filter column exists on the dataset."""
    return set(grouped_filters).issubset(valid_columns)


def get_dataset_from_view(view_id: int, db: duckdb.DuckDBPyConnection) -> str:
    """Resolve the dataset backing a view_id."""
    dataset = get_view_dataset_map(db).get(int(view_id))
    if dataset is None:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get dataset from view ID: {view_id}",
        )
    return dataset


def get_display_column_details(view_id: int, db: duckdb.DuckDBPyConnection):
    """Return per-column metadata for a view, caching results for reuse."""
    if view_id in _display_columns_cache:
        return _display_columns_cache[view_id].copy()

    try:
        columns = db.execute(DISPLAY_COLUMNS_FOR_VIEW_SQL, [view_id]).fetchdf()
        _display_columns_cache[view_id] = columns
        return columns.copy()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get columns to display from view ID: {view_id}",
        ) from exc


def fetch_filters(db: duckdb.DuckDBPyConnection) -> dict:
    """Load the filters configuration used by the UI."""
    return build_filters_config(db)
