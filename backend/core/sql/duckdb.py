"""DuckDB system queries."""

FTS_EXTENSION_LOADED_SQL = """
    SELECT loaded
    FROM duckdb_extensions()
    WHERE extension_name = ?
""".strip()
