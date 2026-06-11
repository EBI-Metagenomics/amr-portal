"""Shared DuckDB connection setup (extension directory, FTS load, pragmas)."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import duckdb

logger = logging.getLogger(__name__)


def extension_directory() -> Optional[Path]:
    """Return extension_directory when configured (set in the API container image)."""
    raw = os.environ.get("DUCKDB_EXTENSION_DIRECTORY")
    if not raw:
        return None
    return Path(raw)


def _apply_extension_directory(conn: duckdb.DuckDBPyConnection) -> None:
    ext_dir = extension_directory()
    if ext_dir is not None:
        conn.execute(f"SET extension_directory='{ext_dir}'")


def configure_duckdb_connection(conn: duckdb.DuckDBPyConnection) -> None:
    """Apply extension directory, load FTS, and request-scoped pragmas."""
    _apply_extension_directory(conn)
    load_fts_extension(conn)
    conn.execute("PRAGMA threads = 4")
    conn.execute("PRAGMA memory_limit = '2GB'")


def load_fts_extension(conn: duckdb.DuckDBPyConnection) -> None:
    """Load the FTS extension, installing first only when not already cached."""
    try:
        conn.execute("LOAD fts")
    except duckdb.Error:
        conn.execute("INSTALL fts")
        conn.execute("LOAD fts")


def is_fts_loaded(conn: duckdb.DuckDBPyConnection) -> bool:
    rows = conn.execute(
        """
        SELECT loaded
        FROM duckdb_extensions()
        WHERE extension_name = 'fts'
        """
    ).fetchall()
    return bool(rows and rows[0][0])


def verify_fts_extension(conn: duckdb.DuckDBPyConnection) -> bool:
    """Ensure FTS is loaded; log outcome. Returns True when FTS is available."""
    ext_dir = extension_directory()
    ext_label = str(ext_dir) if ext_dir is not None else "default"
    loaded = is_fts_loaded(conn)
    if loaded:
        logger.info("DuckDB FTS extension loaded (extension_directory=%s)", ext_label)
    else:
        logger.warning(
            "DuckDB FTS extension is not loaded (extension_directory=%s)", ext_label
        )
    return loaded


def connect_duckdb(
    db_path: str | Path,
    *,
    read_only: bool = False,
) -> duckdb.DuckDBPyConnection:
    """Open a DuckDB connection with FTS and standard pragmas applied."""
    conn = duckdb.connect(str(db_path), read_only=read_only)
    configure_duckdb_connection(conn)
    return conn
