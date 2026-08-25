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
RUN VITE_API_BASE_URL="VITE_API_BASE_URL_PLACEHOLDER" VITE_GENOME_FASTA_BASE_URL="VITE_GENOME_FASTA_BASE_URL_PLACEHOLDER" VITE_GENOME_GFF_BASE_URL="VITE_GENOME_GFF_BASE_URL_PLACEHOLDER" npm run build

FROM alpine:3.20 AS merge
COPY --from=content /src/portal-static/content-dist /tmp/content
COPY --from=app /src/frontend/app-dist /tmp/app
RUN mkdir -p /html/data \
  && cp -a /tmp/content/. /html/ \
  && cp -a /tmp/app/. /html/data/

# Runtime stage — must not run as root (KICS: Missing User Instruction)
FROM nginx:1.27-alpine
LABEL maintainer="ensembl-webteam@ebi.ac.uk"

RUN rm -f /etc/nginx/conf.d/default.conf \
  && mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp \
    /var/log/nginx \
  && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

COPY --chown=nginx:nginx frontend/nginx-conf/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx frontend/nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY --chown=nginx:nginx frontend/nginx-conf/mime.types /etc/nginx/conf.d/mime.types
COPY --chown=nginx:nginx frontend/docker-entrypoint.sh /docker-entrypoint.sh
COPY --chown=nginx:nginx --from=merge /html /usr/share/nginx/html
RUN sed -i 's|<head>|<head><script src="./runtime-config.js"></script>|' /usr/share/nginx/html/data/index.html \
  && chmod +x /docker-entrypoint.sh \
  && chown -R nginx:nginx /usr/share/nginx/html

USER nginx
EXPOSE 8000

CMD ["/docker-entrypoint.sh"]