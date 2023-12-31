FROM node:16-alpine3.16 as builder

ENV NODE_ENV=build
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app

RUN apk update && \
    apk add python3 musl libstdc++ && \
    yarn global add prisma

#RUN apt-get update && \
#    apt-get install -y build-essential \
#    wget \
#    python3 \
#    make \
#    gcc \
#    libc6-dev && \
#    yarn global add prisma

ADD . /app/
RUN yarn install && \
    prisma generate && \
    yarn run build


CMD ["node", "dist/main.js"]

FROM node:16-alpine3.16 as app

ARG NODE_ENV=production 
ENV NODE_ENV=production
ENV TZ=Asia/Hong_Kong
WORKDIR /app

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

USER node
COPY --from=builder --chown=node /app/package*.json /app/
COPY --from=builder --chown=node /app/node_modules /app/node_modules/
COPY --from=builder --chown=node /app/dist/ /app/dist/

USER node
CMD ["node", "dist/main.js"]