#!/usr/bin/env python3
"""
Rebuild global_search and its FTS index on an existing AMR DuckDB database.

Example:
  cd global-search
  uv run python rebuild_global_search.py --db-path /path/to/amr_2025-11.duckdb
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

from amr_global_search import build_global_search


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild global_search table and FTS index in an AMR DuckDB file.",
    )
    parser.add_argument(
        "--db-path",
        required=True,
        help="Path to the AMR DuckDB database file",
    )
    args = parser.parse_args()

    db_path = Path(args.db_path).expanduser().resolve()
    if not db_path.is_file():
        print(f"ERROR: database file not found: {db_path}", file=sys.stderr)
        return 1

    print(f"Rebuilding global_search in {db_path}")
    conn = duckdb.connect(str(db_path))
    try:
        build_global_search(conn)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
