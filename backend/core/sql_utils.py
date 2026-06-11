"""SQL string helpers."""


def quote_column_name(column_name: str) -> str:
    """Quote a column name for DuckDB SQL usage."""
    return f'"{column_name}"'
