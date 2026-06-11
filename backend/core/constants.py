"""Application-wide constants (non-secret defaults and fixed values)."""

# API routing
API_PREFIX = "/api"
API_STATIC_MOUNT = "/api-static"

# Pagination defaults (mirrored in Pydantic request models)
DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 100

# Facet paging
FACET_DEFAULT_LIMIT = 10
FACET_MAX_LIMIT = 200

# Global search
MIN_SEARCH_PREFIX_LENGTH = 3

# Export / streaming
EXPORT_STREAM_BATCH_SIZE = 10_000
CSV_FLUSH_BYTES = 64 * 1024
CSV_FLUSH_ROW_INTERVAL = 500
EXPORT_FILENAME_CSV = "amr_records.csv"
EXPORT_FILENAME_JSON = "amr_records.json"

# DuckDB (overridable via Settings)
DEFAULT_DUCKDB_THREADS = 4
DEFAULT_DUCKDB_MEMORY_LIMIT = "1GB"
DUCKDB_FTS_EXTENSION = "fts"

# HTTP middleware / CORS
DEFAULT_CORS_ORIGINS: list[str] = ["*"]
DEFAULT_CORS_ALLOW_CREDENTIALS = True
DEFAULT_CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "OPTIONS", "HEAD"]
DEFAULT_CORS_ALLOW_HEADERS: list[str] = [
    "Accept",
    "Authorization",
    "Content-Type",
    "Origin",
    "X-Requested-With",
]
GZIP_MINIMUM_SIZE = 1000
GZIP_COMPRESSLEVEL = 5

# Logging
DEFAULT_LOG_LEVEL = "INFO"

# Column metadata keys copied into per-cell API payloads
KNOWN_COLUMN_ATTRIBUTES = ("type", "sortable", "url", "delimiter")
