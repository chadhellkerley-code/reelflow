FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV TMP_DIR=/tmp/variant-worker

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /tmp/variant-worker

EXPOSE 8080

CMD ["npm", "start"]
