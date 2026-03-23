ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20

FROM ${BUILD_FROM}

RUN apk add --no-cache bash nginx

COPY run.sh /run.sh
COPY rootfs/ /
COPY www/ /usr/share/nginx/html

RUN chmod a+x /run.sh

EXPOSE 8099

CMD [ "/run.sh" ]
