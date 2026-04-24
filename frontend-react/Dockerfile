FROM node:24-alpine AS build

WORKDIR /app
COPY ./frontend-react/package*.json ./
RUN npm ci

COPY ./frontend-react ./
RUN npm run build

FROM nginx:1.27-alpine

LABEL maintainer="ensembl-webteam@ebi.ac.uk"

EXPOSE 8000
RUN rm /etc/nginx/conf.d/*

COPY ./frontend-react/nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY ./frontend-react/nginx-conf/mime.types /etc/nginx/conf.d/mime.types
COPY --from=build /app/dist /usr/share/nginx/html
