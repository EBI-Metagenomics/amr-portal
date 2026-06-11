# Builder stage (root is expected here)
FROM python:3.12.2-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential=12.9 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.11.13 /uv /uvx /bin/
WORKDIR /usr/app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1 PYTHONUNBUFFERED=1
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Runtime stage — must not run as root (KICS: Missing User Instruction)
FROM python:3.12.2-slim
LABEL org.opencontainers.image.authors="ensembl-webteam@ebi.ac.uk"

ENV DUCKDB_EXTENSION_DIRECTORY=/opt/duckdb/extensions \
    HOME=/usr/data

RUN groupadd -r amr && useradd -r -g amr amr \
    && mkdir -p /opt/duckdb/extensions /usr/data \
    && chown -R amr:amr /opt/duckdb/extensions /usr/data \
    && chmod -R 755 /opt/duckdb/extensions /usr/data

WORKDIR /usr/app
COPY --chown=amr:amr --from=builder /usr/app/.venv /usr/app/.venv
COPY --chown=amr:amr main.py .
COPY --chown=amr:amr api ./api
COPY --chown=amr:amr core ./core
COPY --chown=amr:amr models ./models
COPY --chown=amr:amr services ./services
COPY --chown=amr:amr static ./static

ENV PATH="/usr/app/.venv/bin:$PATH"

# Pre-install the FTS extension into the image so pods can LOAD without network.
RUN python - <<'PY'
import duckdb

con = duckdb.connect(":memory:")
con.execute("SET extension_directory='/opt/duckdb/extensions'")
con.execute("INSTALL fts")
con.execute("LOAD fts")
rows = con.execute(
    """
    SELECT extension_name, installed, loaded
    FROM duckdb_extensions()
    WHERE extension_name = 'fts'
    """
).fetchall()
if not rows or not rows[0][1] or not rows[0][2]:
    raise SystemExit(f"FTS extension install failed: {rows}")
print("FTS extension ready:", rows[0])
PY


USER amr
EXPOSE 8000
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000", "main:app"]
