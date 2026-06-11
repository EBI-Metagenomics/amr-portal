from functools import lru_cache
from pathlib import Path
import os
from typing import Optional

from pydantic import Field, ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from core.constants import (
    DEFAULT_CORS_ORIGINS,
    DEFAULT_DUCKDB_MEMORY_LIMIT,
    DEFAULT_DUCKDB_THREADS,
    DEFAULT_LOG_LEVEL,
)


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or a .env file.
    Requires DUCKDB_PATH to point to an existing DuckDB file.
    """

    duckdb_path: Path = Field(
        validation_alias="DUCKDB_PATH",
        description="Path to the DuckDB database file",
    )
    duckdb_extension_directory: Optional[Path] = Field(
        default=None,
        validation_alias="DUCKDB_EXTENSION_DIRECTORY",
        description="Directory where DuckDB extensions are pre-installed",
    )
    testing: bool = Field(
        default=False,
        validation_alias="TESTING",
        description="Enable test mode (.env.test, allow FTS INSTALL at runtime)",
    )
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: list(DEFAULT_CORS_ORIGINS),
        validation_alias="CORS_ALLOWED_ORIGINS",
        description="Comma-separated list of allowed CORS origins",
    )
    log_level: str = Field(
        default=DEFAULT_LOG_LEVEL,
        validation_alias="LOG_LEVEL",
        description="Root logging level (DEBUG, INFO, WARNING, ERROR)",
    )
    duckdb_threads: int = Field(
        default=DEFAULT_DUCKDB_THREADS,
        validation_alias="DUCKDB_THREADS",
        description="DuckDB PRAGMA threads value",
    )
    duckdb_memory_limit: str = Field(
        default=DEFAULT_DUCKDB_MEMORY_LIMIT,
        validation_alias="DUCKDB_MEMORY_LIMIT",
        description="DuckDB PRAGMA memory_limit value",
    )

    model_config = SettingsConfigDict(
        # load from .env if present, or .env.test when running pytest
        env_file=".env.test" if os.getenv("TESTING") else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("duckdb_path", mode="after")  # type: ignore[misc]
    @classmethod
    def _validate_duckdb_path(cls, v: Path) -> Path:
        if not str(v).strip():
            raise ValueError("DUCKDB_PATH cannot be empty.")
        if not v.exists():
            raise ValueError(f"DUCKDB_PATH points to a non-existent path: {v}")
        if not v.is_file():
            raise ValueError(f"DUCKDB_PATH must be a file, not a directory: {v}")
        return v

    @field_validator("cors_allowed_origins", mode="before")  # type: ignore[misc]
    @classmethod
    def _parse_cors_origins(cls, v: object) -> list[str]:
        if v is None:
            return list(DEFAULT_CORS_ORIGINS)
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return list(DEFAULT_CORS_ORIGINS)
            if raw == "*":
                return ["*"]
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return list(DEFAULT_CORS_ORIGINS)


class SettingsError(RuntimeError):
    """Raised when application settings are invalid or missing."""

    pass


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Load and cache Settings.
    Raises SettingsError with a readable message on failure.
    """
    try:
        return Settings()
    except ValidationError as e:
        details = "; ".join(
            f"{err['loc'][0]}: {err['msg']}" for err in e.errors()
        )
        raise SettingsError(f"Invalid configuration: {details}") from e
