# Single image: Eleventy (content-dist) + Vite (app-dist) merged for nginx.
# Build context must be the repository root:
#   docker build -f frontend/Dockerfile -t amr-portal-web .

FROM node:24-alpine AS content
WORKDIR /src/portal-static
COPY portal-static/package*.json ./
RUN npm ci
COPY portal-static ./
RUN npm run build

FROM node:24-alpine AS app
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN VITE_API_BASE_URL="VITE_API_BASE_URL_PLACEHOLDER" npm run build

FROM alpine:3.20 AS merge
COPY --from=content /src/portal-static/content-dist /tmp/content
COPY --from=app /src/frontend/app-dist /tmp/app
RUN mkdir -p /html/data \
  && cp -a /tmp/content/. /html/ \
  && cp -a /tmp/app/. /html/data/

FROM nginx:1.27-alpine
LABEL maintainer="ensembl-webteam@ebi.ac.uk"

EXPOSE 8000
RUN rm /etc/nginx/conf.d/*

COPY frontend/nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY frontend/nginx-conf/mime.types /etc/nginx/conf.d/mime.types
COPY --from=merge /html /usr/share/nginx/html

CMD ["/bin/sh", "-c", "API_BASE_URL=\"${VITE_API_BASE_URL:-/amr/api}\"; find /usr/share/nginx/html/data/assets -type f -name '*.js' -exec sed -i \"s|VITE_API_BASE_URL_PLACEHOLDER|${API_BASE_URL}|g\" {} +; nginx -g 'daemon off;'"]
