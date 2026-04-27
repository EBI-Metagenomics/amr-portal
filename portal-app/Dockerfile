# Single image: Eleventy (content-dist) + Vite (app-dist) merged for nginx.
# Build context must be the repository root:
#   docker build -f portal-app/Dockerfile -t amr-portal-web .

FROM node:24-alpine AS content
WORKDIR /src/portal-static
COPY portal-static/package*.json ./
RUN npm ci
COPY portal-static ./
RUN npm run build

FROM node:24-alpine AS app
WORKDIR /src/portal-app
COPY portal-app/package*.json ./
RUN npm ci
COPY portal-app ./
RUN npm run build

FROM alpine:3.20 AS merge
COPY --from=content /src/portal-static/content-dist /tmp/content
COPY --from=app /src/portal-app/app-dist /tmp/app
RUN mkdir -p /html/data \
  && cp -a /tmp/content/. /html/ \
  && cp -a /tmp/app/. /html/data/

FROM nginx:1.27-alpine
LABEL maintainer="ensembl-webteam@ebi.ac.uk"

EXPOSE 8000
RUN rm /etc/nginx/conf.d/*

COPY portal-app/nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY portal-app/nginx-conf/mime.types /etc/nginx/conf.d/mime.types
COPY --from=merge /html /usr/share/nginx/html
