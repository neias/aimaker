FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

EXPOSE 3001
CMD ["bun", "dist/main.js"]
