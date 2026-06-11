from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import duckdb


def query_to_records(
    db: duckdb.DuckDBPyConnection,
    sql: str,
    params: Sequence[Any] | None = None,
) -> list[dict[str, Any]]:
    """Run a SQL query and return a list of dict records."""
    if params:
        return db.execute(sql, list(params)).fetchdf().to_dict(orient="records")
    return db.query(sql).fetchdf().to_dict(orient="records")
