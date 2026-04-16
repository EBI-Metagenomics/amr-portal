import duckdb
from backend.core.utils import query_to_records


def fetch_release(db: duckdb.DuckDBPyConnection) -> dict[str, str] | None:
    release_query = "SELECT release_label as label FROM release"
    release_rows = query_to_records(db, release_query)
    release = release_rows[0] if release_rows else None
    return release
