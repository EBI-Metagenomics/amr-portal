from core.config import get_settings
from core.duckdb_conn import connect_duckdb

settings = get_settings()


def get_db_connection():
    """
    FastAPI dependency for database connections.
    Creates a new connection for each request.
    """
    conn = connect_duckdb(settings.duckdb_path, read_only=True)
    try:
        yield conn
    finally:
        conn.close()
