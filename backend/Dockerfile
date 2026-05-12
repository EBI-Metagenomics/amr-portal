# Builder stage
FROM python:3.12.2-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.11.13 /uv /uvx /bin/
WORKDIR /usr/app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# AMR Backend
LABEL org.opencontainers.image.authors="ensembl-webteam@ebi.ac.uk"

FROM python:3.12.2-slim
RUN groupadd amr && useradd amr -g amr
USER amr
WORKDIR /usr/app
EXPOSE 8000
COPY --chown=amr:amr --from=builder /usr/app/.venv /usr/app/.venv
COPY --chown=amr:amr main.py .
COPY --chown=amr:amr api ./api
COPY --chown=amr:amr core ./core
COPY --chown=amr:amr models ./models
COPY --chown=amr:amr services ./services

ENV PATH="/usr/app/.venv/bin:$PATH"
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000", "main:app"]
