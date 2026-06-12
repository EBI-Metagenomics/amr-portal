"""DuckDB connection lifecycle — one connection, one worker thread."""

from __future__ import annotations

import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import duckdb

from core.config import get_settings
from core.duckdb_conn import connect_duckdb

logger = logging.getLogger(__name__)
_settings = get_settings()

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="duckdb")
_conn: duckdb.DuckDBPyConnection | None = None


def _connection() -> duckdb.DuckDBPyConnection:
    if _conn is None:
        raise RuntimeError("DuckDB is not initialized — was app lifespan started?")
    return _conn


def init_db_connection() -> None:
    """Open the process-wide read-only connection on the DuckDB worker thread."""
    _executor.submit(_open_connection).result()


def verify_db_at_startup() -> tuple[bool, bool]:
    """Run FTS / global-search checks on the DuckDB worker thread."""

    def _verify() -> tuple[bool, bool]:
        from core.duckdb_conn import verify_fts_extension
        from services.global_search import is_global_search_available, set_global_search_available

        conn = _connection()
        fts_ok = verify_fts_extension(conn)
        search_ok = is_global_search_available(conn) if fts_ok else False
        set_global_search_available(search_ok)
        return fts_ok, search_ok

    return _executor.submit(_verify).result()


def _open_connection() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        logger.info("Opening DuckDB connection at %s", _settings.duckdb_path)
        _conn = connect_duckdb(_settings.duckdb_path, read_only=True)
    return _conn


def run_in_db[T](func: Callable[..., T], /, *args, **kwargs) -> T:
    """
    Run a callable that takes a DuckDB connection as its last argument.

    All queries share one connection on a dedicated thread so DuckDB stays
    thread-safe and we never accumulate connections across the HTTP thread pool.
    """
    return _executor.submit(lambda: func(*args, _connection(), **kwargs)).result()


def close_db_connection() -> None:
    """Shut down the DuckDB worker thread and close the connection."""
    global _conn

    def _close() -> None:
        global _conn
        if _conn is not None:
            _conn.close()
            _conn = None

    _executor.submit(_close).result()
    logger.info("DuckDB connection closed")
