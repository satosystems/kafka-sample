FROM openjdk:17-slim

RUN \
  apt update && \
  apt install -y nodejs npm && \
  npm install -g npm@latest
