# Deployment and environment

One `compose.yml` runs everything. Nothing else is installed on the host but
Docker with the Compose plugin.

---

## Services

| Service | Image | Port | Role |
|---|---|---|---|
| `secrets` | `alpine:3.24` | none | one-shot: fills the `secrets` volume (`scripts/generate-secrets.sh`), then exits |
| `db` | `mysql:9.7` | none published | data, in the `db-data` volume |
| `redis` | `redis:8.10-alpine` | none published | rate-limit counters; no persistence, password from the `secrets` volume |
| `backend` | `backend/Dockerfile`, stage `runtime` | 3000, internal only | the API |
| `frontend` | `frontend/Dockerfile` (nginx) | `${APP_PORT:-8080}` → 80 | the SPA, and `/api/*` proxied to `backend:3000` |
| `backend-test` | `backend/Dockerfile`, stage `test` | none | profile `test`; only `docker compose run` starts it |

Start order is enforced by `depends_on`: `secrets` completed → `db` healthy
(TCP ping) and `redis` healthy (`PING`) → `backend` healthy (`GET /api/health`, which queries MySQL) →
`frontend`.

**One origin.** The browser only ever talks to nginx, so the API needs no
CORS and the backend port is never published.

## Schema bootstrap

The backend image's `CMD` runs `src/migrate.ts` before the server starts, on
every boot. It applies whatever in `backend/migrations/` is not yet in
`schema_migrations` and is a no-op otherwise. There is no seed: an empty database is a
valid state, and the first user registers through the UI.

`db/init/01-test-database.sql` creates `habit_shaper_test`, the database the
backend suite wipes. MySQL runs `docker-entrypoint-initdb.d` only on an
**empty** volume (`RULES.md` §6).

## Environment variables

Each part keeps its own file, and the same file serves Docker and a run
without it: `backend/.env` and `frontend/.env`, each from its
`.env.example`. The `.env` next to `compose.yml` holds only `APP_PORT`,
because compose interpolates `${...}` from that file alone. None is required.

Compose passes `backend/.env` to `secrets` and `backend` with `env_file`
(`required: false`). The `secrets` service has no `environment:` key, since
one would override the file. The backend's `environment:` pins `HOST` and
`PORT` over the file's, which are for running outside Docker. Neither image
contains a backend `.env` (`.dockerignore`); the frontend build context keeps
`frontend/.env`, so `npm run build` in the image reads its `VITE_*` values.

**Secrets** (`APP_KEY`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `REDIS_PASSWORD`) and the MySQL
names reach the `secrets` service. It writes each into the `secrets` volume:
the `backend/.env` value if set, otherwise the one already there, otherwise a
random one. The other services read files, never the variables: MySQL through
`MYSQL_*_FILE`, Redis through its command line, the backend through
`APP_KEY_FILE`, `DATABASE_URL_FILE` and `REDIS_URL_FILE`, which `backend/docker-entrypoint.sh` loads into the
environment before the stage's `CMD`. Deleting the `secrets` volume without
`db-data` leaves MySQL on the old passwords and every MFA secret unreadable.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `APP_PORT` | `8080` | frontend | host port; the root `.env`, not `frontend/.env` |
| `APP_KEY` | generated | backend, backend-test | encrypts MFA secrets and challenges. **Changing it locks out every MFA account** |
| `MYSQL_DATABASE` | `habit_shaper` | db, backend | |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `habit` / generated | db, backend | spliced into `DATABASE_URL` unescaped: letters and digits only |
| `MYSQL_ROOT_PASSWORD` | generated | db, backend-test | |
| `REDIS_PASSWORD` | generated | redis, backend | spliced into `REDIS_URL` (database 0) and the suite's `TEST_REDIS_URL` (database 1) |
| `LOG_LEVEL` | `info` | backend | pino levels |

The backend itself reads `DATABASE_URL`, `REDIS_URL` (empty: limits count in memory), `APP_KEY`, `PORT` (3000), `HOST`
(`0.0.0.0`), `TRUST_PROXY` (`loopback,uniquelocal`) and `LOG_LEVEL`
(`backend/src/config.ts`); `src/migrate.ts` reads `DATABASE_URL` too. In Docker, `scripts/generate-secrets.sh` builds it
from the `MYSQL_*` values and it replaces the one in `backend/.env`. Outside
Docker, `npm run dev`, `npm start` and `npm test` load `backend/.env` with
`--env-file-if-exists`, and `test/setup.ts` points `DATABASE_URL` at `TEST_DATABASE_URL`. The frontend's `vite.config.ts` reads `BACKEND_URL`.

MySQL applies `MYSQL_*` only when it initialises an empty volume. Changing a
password in `backend/.env` later needs `docker compose down -v` (which **deletes the
data**) or an `ALTER USER` by hand.

## Images

- **Backend**: `node:24-trixie-slim`. Node runs the TypeScript in `src/`
  itself (type stripping), so there is no build step. Stages: `deps` → `test`,
  and `runtime` (production dependencies, `src/`, `migrations/`, runs as `node`).
- **Frontend**: builds with Node, serves `dist/` from `nginx:1.30-alpine`.
  Security headers are set once at `server {}` level; cache headers use
  `expires`, never `add_header` (`RULES.md` §6).

## Behind another reverse proxy

To put the app behind a host-level nginx or a load balancer, point it at
`APP_PORT` and forward `X-Forwarded-For`. The backend trusts that header from
private addresses only (`TRUST_PROXY`), which is how rate limits key on the
visitor. Terminate HTTPS at that proxy. The session cookie is marked `Secure`
whenever the page is served over HTTPS.
