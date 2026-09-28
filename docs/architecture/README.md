# Architecture — orientation

How Habit Shaper is built. Start here, then read the one file your task needs.

| File | Covers |
|---|---|
| `README.md` | stack, repository layout, known gaps |
| `api.md` | the envelope, error codes, `api.ts`, sessions, MFA, every route |
| `habits.md` | habits, check-ins, streaks, weekly rate, goals |
| `deployment.md` | compose, images, environment variables, migrations on boot, nginx |
| `../decisions.md` | why things are the way they are |
| `../security.md` | the threat model and what tests pin it |

---

## Stack

| Layer | Choice | Where |
|---|---|---|
| Backend framework | Fastify ^5 | `backend/src/app.ts` |
| Language | TypeScript ~7.0, strict, ESM (`NodeNext`); the backend runs it by Node's type stripping, `tsc` only checks | |
| Database access | `@fastify/mysql` (a `mysql2` promise pool); SQL in one repository per module | `backend/src/modules/*/repository.ts`, pool options in `backend/src/db.ts` |
| Migrations | numbered `.sql` files, applied on boot by `src/migrate.ts` | `backend/migrations/` |
| Database | MySQL 9.7 | `compose.yml` service `db` |
| Rate limits | `@fastify/rate-limit`, counting in Redis 8.10 (in memory outside Docker) | `backend/src/plugins/rate-limit.ts`, `compose.yml` service `redis` |
| Hardening | `@fastify/helmet`, `@fastify/compress`, `@fastify/under-pressure`, redacted Pino logs, `close-with-grace` | `backend/src/plugins/`, `backend/src/lib/logging.ts`, `backend/src/server.ts` |
| Validation | TypeBox route schemas, checked by Fastify's Ajv (`ajv-errors` for the messages) | `backend/src/modules/*/schemas.ts`, `backend/src/lib/validation.ts` |
| Password hashing | argon2id, `@node-rs/argon2` | `backend/src/lib/password.ts` |
| TOTP | hand-written RFC 6238 | `backend/src/lib/totp.ts` |
| Backend tests | `node:test` + `app.inject` against MySQL | `backend/test/` |
| Frontend framework | React ^19 | `frontend/` |
| Bundler | Vite ^8 | |
| Styling | Tailwind CSS v4, theme tokens in `src/index.css` | |
| Routing | react-router ^8, declarative `<Routes>`; every page but Login and Today is a `React.lazy` chunk | `frontend/src/App.tsx`, `frontend/src/pages/lazy.ts` |
| Data fetching | SWR, keyed by endpoint, over `api.ts` | `frontend/src/hooks/useData.ts` and one hook file per area |
| Cookies | js-cookie | `frontend/src/utils/cookies.ts` |
| QR codes | qrcode, drawn in the browser, imported only when MFA setup starts | `pages/settings/MfaSection.tsx` |
| Icons | hand-drawn inline SVG, no package | `frontend/src/components/icons.tsx` |
| Font | Urbanist, from Google Fonts | `frontend/index.html` |
| Frontend tests | vitest + jsdom | `frontend/test/` |
| Web server | nginx, serves the SPA and proxies `/api` | `frontend/nginx.conf` |

---

## Repository layout

```
.
├── CLAUDE.md            ← the map, and the only document read every session
├── RULES.md PRD.md      hard rules and traps by section; scope
├── README.md            how to run it (for people)
├── compose.yml          secrets · db · redis · backend · frontend · backend-test (profile "test")
├── .env.example         APP_PORT only; backend/ and frontend/ have their own
├── scripts/             generate-secrets.sh, run by the `secrets` service
├── .claude/rules/       conventions, each loaded by the paths it declares
├── db/init/             SQL run once on an empty MySQL volume
├── docs/                architecture/ design/ process/ decisions.md security.md
├── backend/
│   ├── migrations/      0001_initial.sql …  ← THE schema
│   ├── src/app.ts       buildApp(): autoloads plugins/, then each modules/*/routes.ts under /api
│   ├── src/server.ts    listens
│   ├── src/lib/         crypto, password, totp, challenge, tokens, errors, http, validation, dates, streaks
│   ├── src/plugins/     config, mysql, redis, rate-limit, errors (the envelope), auth (`app.authenticate`), services, helmet, compress, under-pressure
│   ├── src/modules/     auth/ account/ users/ habits/ goals/ health/: routes · schemas · service · repository · serialize
│   └── test/
└── frontend/
    ├── nginx.conf       the production server block
    ├── src/services/    api.ts (the only fetch) + one file per API area
    ├── src/hooks/       useAuth.tsx; useData.ts (SWR); useHabits, useGoals, useDevices
    ├── src/components/  ui.tsx, icons.tsx, Shells.tsx, RouteGuards.tsx
    ├── src/utils/       cookies.ts, dates.ts, habits.ts
    ├── src/pages/       one folder per area: today/ habits/ goals/ settings/; auth pages at the top; lazy.ts
    └── test/
```

`@/` aliases `frontend/src/` in `vite.config.ts` and `tsconfig.json`, and
`backend/src/` in `tsconfig.json` and, at runtime, `src/alias.ts`.

---

## Known gaps

1. Goals measure only a streak; there is no "done N times" or deadline goal.
2. There is no way to rotate `APP_KEY` without locking out every MFA account.
3. An account without MFA that forgets its password cannot recover it on its
   own: reset is proven by an authenticator code, and there is no email.
4. No account deletion and no name/email change.
5. Outside Docker, rate-limit counters live in process memory (`RULES.md` §6).
