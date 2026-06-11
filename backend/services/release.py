import duckdb

from core.sql.release import RELEASE_LABEL_SQL
from core.utils import query_to_records


def fetch_release(db: duckdb.DuckDBPyConnection) -> dict[str, str] | None:
    release_rows = query_to_records(db, RELEASE_LABEL_SQL)
    return release_rows[0] if release_rows else None
