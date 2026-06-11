"""DuckDB FTS extension setup for global-search build jobs."""

from __future__ import annotations

import os
from pathlib import Path

import duckdb

def extension_directory() -> Path | None:
    raw = os.environ.get("DUCKDB_EXTENSION_DIRECTORY")
    if not raw:
        return None
    return Path(raw)


def ensure_fts_extension(conn: duckdb.DuckDBPyConnection) -> None:
    """Set extension directory and load FTS, installing only when not cached."""
    ext_dir = extension_directory()
    if ext_dir is not None:
        conn.execute(f"SET extension_directory='{ext_dir}'")
    try:
        conn.execute("LOAD fts")
    except duckdb.Error:
        conn.execute("INSTALL fts")
        conn.execute("LOAD fts")
