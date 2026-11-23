FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3210 MIPS_LAB_ROOT=/app MIPS_LAB_CONTAINER=1 MIPS_LAB_WORKER_SOCKET=/run/mips-worker/worker.sock
COPY --from=build /app/.output ./.output
COPY scripts/limit.py ./scripts/limit.py
COPY runtime/Mars4_5.jar ./runtime/Mars4_5.jar
COPY docker/app-health.mjs ./docker/app-health.mjs
RUN mkdir -p /app/data /run/mips-worker && chown node:node /app/data
USER node
EXPOSE 3210
CMD ["node",".output/server/index.mjs"]
