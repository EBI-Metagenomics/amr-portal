"""Shared DuckDB connection setup (extension directory, FTS load, pragmas)."""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Optional

import duckdb

from core.config import get_settings
from core.constants import DUCKDB_FTS_EXTENSION

logger = logging.getLogger(__name__)

_fts_initialized = False
_fts_init_lock = threading.Lock()


def extension_directory() -> Optional[Path]:
    """Return extension_directory when configured (set in the API container image)."""
    return get_settings().duckdb_extension_directory


def _apply_extension_directory(conn: duckdb.DuckDBPyConnection) -> None:
    ext_dir = extension_directory()
    if ext_dir is not None:
        conn.execute(f"SET extension_directory='{ext_dir}'")


def is_fts_loaded(conn: duckdb.DuckDBPyConnection) -> bool:
    rows = conn.execute(
        """
        SELECT loaded
        FROM duckdb_extensions()
        WHERE extension_name = ?
        """,
        [DUCKDB_FTS_EXTENSION],
    ).fetchall()
    return bool(rows and rows[0][0])


def load_fts_extension(
    conn: duckdb.DuckDBPyConnection,
    *,
    allow_install: bool = False,
) -> bool:
    """
    Load the FTS extension from the configured extension directory.

    Runtime API paths must not INSTALL extensions (slow, may use HTTP_PROXY).
    Set allow_install=True only in tests or image build scripts.
    """
    if is_fts_loaded(conn):
        return True
    try:
        conn.execute(f"LOAD {DUCKDB_FTS_EXTENSION}")
        return is_fts_loaded(conn)
    except duckdb.Error as exc:
        if is_fts_loaded(conn):
            return True
        if not allow_install:
            logger.warning(
                "Failed to LOAD fts extension at runtime (skipping INSTALL): %s", exc
            )
            return False
        try:
            conn.execute(f"INSTALL {DUCKDB_FTS_EXTENSION}")
            conn.execute(f"LOAD {DUCKDB_FTS_EXTENSION}")
            return is_fts_loaded(conn)
        except duckdb.Error as install_exc:
            logger.warning("Failed to INSTALL/LOAD fts extension: %s", install_exc)
            return False


def configure_duckdb_connection(conn: duckdb.DuckDBPyConnection) -> None:
    """Apply extension directory, load FTS once per process, and pragmas."""
    global _fts_initialized
    settings = get_settings()
    _apply_extension_directory(conn)
    with _fts_init_lock:
        if not _fts_initialized:
            _fts_initialized = load_fts_extension(
                conn, allow_install=settings.testing
            )
        # Later connections skip LOAD fts — concurrent LOAD calls crash or corrupt the process.
    conn.execute(f"PRAGMA threads = {settings.duckdb_threads}")
    conn.execute(f"PRAGMA memory_limit = '{settings.duckdb_memory_limit}'")


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
