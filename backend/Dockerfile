# Builder stage
FROM python:3.12.2-slim AS builder
RUN apt-get update
RUN apt-get install -y --no-install-recommends build-essential gcc
WORKDIR /usr/app
RUN python -m venv /usr/app/venv
ENV PATH="/usr/app/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install -r requirements.txt

# AMR Backend
LABEL org.opencontainers.image.authors="ensembl-webteam@ebi.ac.uk"

FROM python:3.12.2-slim
RUN groupadd amr && useradd amr -g amr
WORKDIR /usr/app
COPY --chown=amr:amr --from=builder /usr/app/venv /usr/app/venv
COPY --chown=amr:amr . /usr/app/backend
ENV PATH="/usr/app/venv/bin:$PATH"
ENV PYTHONPATH=/usr/app
USER amr
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
