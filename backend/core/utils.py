from typing import Any

def query_to_records(db, sql: str) -> list[dict[str, Any]]:
    """Run a SQL query and return a list of dict records.

    Args:
        db: Database connection object exposing `.query(sql).fetchdf()`.
        sql: SQL query to execute.

    Returns:
        List[Dict[str, Any]]: Each row represented as a dictionary.
    """
    return db.query(sql).fetchdf().to_dict(orient="records")