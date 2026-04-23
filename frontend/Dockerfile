FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm ci

COPY ./frontend ./
RUN npm run build

FROM nginx:1.14

LABEL maintainer="ensembl-webteam@ebi.ac.uk"

EXPOSE 80 8000
RUN rm /etc/nginx/conf.d/*

COPY ./frontend/nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY ./frontend/nginx-conf/mime.types /etc/nginx/conf.d/mime.types
COPY --from=frontend-builder /app/frontend/dist /usr/assets/dist

