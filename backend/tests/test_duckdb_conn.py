import duckdb

from core.duckdb_conn import configure_duckdb_connection, is_fts_loaded, load_fts_extension


def test_load_fts_extension_in_memory():
    conn = duckdb.connect(":memory:")
    try:
        load_fts_extension(conn)
        assert is_fts_loaded(conn)
    finally:
        conn.close()


def test_configure_duckdb_connection_applies_pragmas():
    conn = duckdb.connect(":memory:")
    try:
        configure_duckdb_connection(conn)
        assert is_fts_loaded(conn)
        threads = conn.execute("SELECT current_setting('threads')").fetchone()[0]
        assert int(threads) == 4
    finally:
        conn.close()
