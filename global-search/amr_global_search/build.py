"""
Build and rebuild the global_search table and FTS index for AMR portal search.

SQL definitions live in global-search/sql/ and are executed in order by
build_global_search().
"""

from __future__ import annotations

import time
from pathlib import Path

import duckdb

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"

REQUIRED_SOURCE_TABLES = ("phenotype", "genotype", "pheno_geno_merged")

SQL_SCRIPTS = (
    "01_create_table.sql",
    "02_create_fts_index.sql",
)


def _load_sql(script_name: str) -> str:
    path = SQL_DIR / script_name
    if not path.is_file():
        raise FileNotFoundError(f"Global search SQL script not found: {path}")
    return path.read_text(encoding="utf-8")


def _ensure_fts_extension(conn: duckdb.DuckDBPyConnection) -> None:
    conn.execute("INSTALL fts;")
    conn.execute("LOAD fts;")


def _ensure_source_tables(conn: duckdb.DuckDBPyConnection) -> None:
    existing = {
        row[0]
        for row in conn.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'main'
              AND table_type = 'BASE TABLE'
            """
        ).fetchall()
    }
    missing = [name for name in REQUIRED_SOURCE_TABLES if name not in existing]
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(
            f"Cannot build global_search: missing source table(s): {names}"
        )


def _execute_sql_script(conn: duckdb.DuckDBPyConnection, script_name: str) -> None:
    sql = _load_sql(script_name)
    conn.execute(sql)


def _log_build_summary(conn: duckdb.DuckDBPyConnection) -> None:
    rows = conn.execute(
        """
        SELECT source_table, COUNT(*) AS row_count
        FROM global_search
        GROUP BY source_table
        ORDER BY source_table
        """
    ).fetchall()
    total = sum(count for _, count in rows)
    print("global_search row counts:")
    for source_table, row_count in rows:
        print(f"  {source_table}: {row_count:,}")
    print(f"  total: {total:,}")


def build_global_search(conn: duckdb.DuckDBPyConnection) -> None:
    """
    Rebuild global_search and its FTS index from the current source tables.

    Runs SQL scripts from global-search/sql/ in order:
      1. 01_create_table.sql
      2. 02_create_fts_index.sql

    Safe to re-run on an existing database after source data updates.
    """
    started = time.perf_counter()
    print("Building global_search table and FTS index...")

    _ensure_source_tables(conn)
    _ensure_fts_extension(conn)

    for script_name in SQL_SCRIPTS:
        print(f"  Running {script_name}")
        _execute_sql_script(conn, script_name)

    _log_build_summary(conn)
    elapsed = time.perf_counter() - started
    print(f"global_search build completed in {elapsed:.1f}s")
