FROM node:24-trixie-slim AS base
WORKDIR /app
# npm's upgrade banner on every boot is noise in `docker compose logs`.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# `docker compose run --rm backend-test` — the suite against its own database,
# which the test helpers migrate before the first test.
FROM deps AS test
COPY . .
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["npm", "test"]

# Last stage = the default target compose builds for `backend`. Node runs the
# TypeScript in src/ itself (type stripping), so there is no build step.
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY migrations ./migrations
COPY src ./src
COPY docker-entrypoint.sh ./
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
# Schema bootstrap on every boot: applies whatever in migrations/ has not run
# yet, and does nothing when the database is current.
CMD ["sh", "-c", "node --import ./src/alias.ts src/migrate.ts && exec node --import ./src/alias.ts src/server.ts"]
