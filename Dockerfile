FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && pip3 install yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ./server/ ./
RUN npm install --omit=dev

EXPOSE $PORT

CMD ["node", "index.js"]
