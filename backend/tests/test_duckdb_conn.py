import duckdb
import pytest

import core.duckdb_conn as duckdb_conn
from core.config import get_settings
from core.duckdb_conn import configure_duckdb_connection, is_fts_loaded, load_fts_extension


@pytest.fixture(autouse=True)
def reset_process_fts_flag():
    duckdb_conn._fts_initialized = False
    yield
    duckdb_conn._fts_initialized = False


def test_load_fts_extension_in_memory():
    conn = duckdb.connect(":memory:")
    try:
        load_fts_extension(conn, allow_install=True)
        assert is_fts_loaded(conn)
    finally:
        conn.close()


def test_configure_duckdb_connection_applies_pragmas(monkeypatch):
    monkeypatch.setenv("TESTING", "1")
    get_settings.cache_clear()
    conn = duckdb.connect(":memory:")
    try:
        configure_duckdb_connection(conn)
        assert is_fts_loaded(conn)
        threads = conn.execute("SELECT current_setting('threads')").fetchone()[0]
        assert int(threads) == 4
    finally:
        conn.close()
