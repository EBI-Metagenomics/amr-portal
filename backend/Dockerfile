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
USER amr
WORKDIR /usr/app/venv
EXPOSE 8000
COPY --chown=amr:amr --from=builder /usr/app/venv /usr/app/venv
COPY --chown=amr:amr . ./backend

ENV PATH="/usr/app/venv/bin:$PATH"
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000" ,"backend.main:app"]