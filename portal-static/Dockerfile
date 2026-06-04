# Runtime stage — must not run as root (KICS: Missing User Instruction)
FROM nginx:1.27-alpine
LABEL maintainer="ensembl-webteam@ebi.ac.uk"

RUN rm -f /etc/nginx/conf.d/default.conf \
  && mkdir -p /var/cache/nginx /var/log/nginx /var/run \
  && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run /etc/nginx/conf.d /usr/share/nginx/html

COPY --chown=nginx:nginx nginx-conf/local.conf /etc/nginx/conf.d/local.conf
COPY --chown=nginx:nginx nginx-conf/mime.types /etc/nginx/conf.d/mime.types

USER nginx
EXPOSE 80 8000
