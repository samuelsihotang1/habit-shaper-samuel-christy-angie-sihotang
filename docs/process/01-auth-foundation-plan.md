# Plan 1: documentation system, foundation and authentication

## Context

The repository is empty; the specification is the brief. Decisions taken
before starting:

- **Backend:** Fastify 5 + TypeScript on Node 24, run by Node's type
  stripping. **Database access:** `@fastify/mysql` with the SQL in one
  repository per module. **Schema:** numbered `.sql` migrations, applied by
  the backend on every boot, so the first boot bootstraps the schema.
- **Reference for the code:** the `fastify` and `react-best-practices`
  skills, installed under `.claude/skills/` before the first line of code.
  Every file follows their rules; where a rule is a choice, the choice is a
  row in `docs/decisions.md`.
- **Documentation:** a map-first `.md` system, so that each new agent
  session reads a map instead of the whole codebase.
- **Authentication:** **without Google sign-in**: email-first sign-in,
  register, logout, change password, **TOTP two-factor** (authenticator app),
  and a **password reset proven by a two-factor code** (no email).
- **Look:** the brand guideline of the Behance case study "Habit tracker
  mobile app - UIUX design" (Haptive), with the Urbanist font; one
  phone-width column on every screen size.

Scope of this plan: **documentation, skills, scaffold, Docker Compose and
authentication end to end.** Habits and goals are the next plan; the schema
and the documents are prepared here so that phase only has to follow them.

---

## 1. How the documentation system works

| Principle | What it looks like |
|---|---|
| **`CLAUDE.md` is the map, not the manual.** The only file every session reads | §1 command table (and which commands may run without asking), §2 "your task → read this file, then stop", §3 non-negotiables, §4 how to write documentation |
| **`RULES.md` is a numbered reference, not a read.** | Code comments point at `RULES.md §6`; §1 hard rules, §5 checklists for multi-file changes, §6 **known traps** (one table row per trap) |
| **`.claude/rules/*.md` with a `paths:` frontmatter** | Backend, frontend and test conventions load automatically when a matching file is opened; `RULES.md` keeps only a pointer |
| **`docs/architecture/*`** | One file per subsystem (`api.md`: envelope, auth, every route). `README.md`: orientation, stack, repository layout, known gaps |
| **`docs/decisions.md`** | A `Decision \| Rationale \| Don't` table: the reason, and what breaks if it is reversed |
| **`docs/security.md`** | An `Attack \| Control \| Tested by` table plus "what to watch" |
| **`PRD.md`** | Product scope: is this feature in |
| **Writing rule:** only what the code cannot tell you | Dependency behaviour, decisions with a live alternative, traps, contracts between files. Write what is true *now*. When the code and a document disagree, the code wins and the document is fixed in the same change |

### Files to create

```
CLAUDE.md                     map: commands, "where to read next", non-negotiables, writing rules
RULES.md                      §1 hard rules · §5 multi-file checklists · §6 known traps · §7 git · pointers for §2/§3/§8
PRD.md                        scope, derived from the brief
README.md                     required by the brief: exact docker compose commands, env var table
.claude/rules/backend.md      paths: backend/src/**, backend/migrations/**
.claude/rules/frontend.md     paths: frontend/src/**
.claude/rules/tests.md        paths: backend/test/**, frontend/test/**
.claude/skills/               fastify, react-best-practices
docs/architecture/README.md   stack, repository layout, known gaps
docs/architecture/api.md      envelope, error codes, api.ts, auth and MFA flows, every route
docs/architecture/deployment.md  compose, migrations on boot, env, ports
docs/decisions.md             Decision | Rationale | Don't
docs/security.md              Attack | Control | Tested by, plus what to watch
docs/design/README.md         the design system: colour, type, shapes, components, copy
```

`docs/process/` keeps this plan and the ones after it, because the brief asks
to commit "artifacts generated during your development process".

---

## 2. Repository layout and stack

```
compose.yml          secrets · db (mysql:9.7) · redis · backend · frontend · backend-test   ← `docker compose up`
backend/  Fastify 5, TypeScript 7 strict (type stripping, `tsc` only checks), @fastify/mysql,
          TypeBox route schemas, @fastify/autoload, @fastify/rate-limit on Redis, argon2id, node:test
  migrations/0001_initial.sql       the whole schema: users, sessions, trusted browsers, habits, logs, goals
  src/app.ts (buildApp, used by the server and the tests) · server.ts (close-with-grace) · migrate.ts
  src/plugins/  config · mysql · redis · rate-limit · errors (envelope) · auth (app.authenticate) · services
                · helmet · compress · under-pressure
  src/modules/  auth/ · account/ · users/ · health/   routes · schemas · service · repository · serialize
  src/lib/      password (argon2id) · tokens · totp · challenge · crypto · errors · validation · http · logging
frontend/ React 19, Vite, TypeScript strict, Tailwind v4, react-router, SWR, js-cookie, qrcode, vitest
  src/services/api.ts (the only fetch) · services/auth.ts · services/account.ts
  src/hooks/useAuth.tsx · useData.ts (SWR) · useDevices.ts · components/RouteGuards.tsx · Shells.tsx · ui.tsx
  src/pages/  LoginPage · SignUpPage · ForgotPasswordPage · settings/ · lazy.ts
  Dockerfile, multi-stage → nginx serving the build and proxying /api to the backend
```

- **Password hashing:** argon2id through `@node-rs/argon2`, which ships
  prebuilt binaries, so nothing compiles in the image.
- **Every secret from the environment:** `APP_KEY` (challenge encryption),
  the MySQL and Redis passwords. None is a literal or a default anywhere; a
  one-shot `secrets` service generates whatever `backend/.env` leaves unset,
  so `docker compose up` on a fresh clone needs no `.env`.
- **English UI only, no i18n** (recorded in `decisions.md`; the brief does not
  ask for two languages).

---

## 3. Authentication without Google

### Data

| Table | Key columns |
|---|---|
| `users` | `id` (uuid), `name`, `email` unique, `password_hash`, `mfa_secret?` (encrypted with `APP_KEY`), `mfa_confirmed_at?`, `mfa_last_counter?`, timestamps |
| `access_tokens` | `id`, `user_id`, `token_hash` (sha256), `last_used_at`, `created_at`. **An opaque token**, `<id>\|<secret>`. **No expiry column**: a token lives until logout, a password change or a reset |
| `trusted_devices` | `id`, `user_id`, `token_hash`, `user_agent`, `last_used_at`. No expiry either; revoked from the account page or by a password reset |

**Sessions never expire:** a user stays signed in until they sign out. The
only thing with a lifetime is the MFA challenge (5 minutes), because it is
the window between the password and the code, not a session.

Users leave the API only through an explicit serializer, so `password_hash`
and `mfa_secret` can never be sent; a response schema also drops any key it
does not list.

### Envelope and errors

`{ success, data, message }`. A failure also carries `code` and `params` (for
example `auth.invalidCredentials`, `mfa.badCode`) and per-field `errors` for
validation. A global error handler turns anything unexpected into a flat 500
with no stack trace or SQL. Statuses: 200, 201, 400, 401, 404, 413, 422, 429,
500, 503.

### Flows

```
POST /auth/identify {email}            → { exists }            20/min
  exists=false → the SPA goes to /signup?email=
POST /register {name,email,password,password_confirmation} → { user, token }   20/hour per IP
POST /login {email,password,device_token?}
  wrong password                → 422 auth.invalidCredentials
  MFA on and trusted browser    → { user, token }
  MFA on and not trusted        → { mfa_required, challenge }   ← no token
  MFA off                       → { user, token }
  limits: 5/min per email+IP, 10/15 min per email, 60/min per IP
POST /auth/mfa {challenge,code,trust_device?} → { user, token, device_token? }  10/min
POST /auth/password/reset {email,code,password,password_confirmation}   5/15 min per email+IP
  only for accounts with MFA on (otherwise 422 auth.resetNeedsMfa)
  the code is consumed (anti-replay) → password replaced, EVERY token and trusted browser revoked

Authenticated (Bearer):
POST /logout                           deletes the token in use
GET  /me
PUT  /account/password {current_password,password,password_confirmation}  revokes the other tokens
POST /account/mfa/setup                → { secret, otpauth_url }  (not active yet)
POST /account/mfa/confirm {code}       → turns it on
POST /account/mfa/disable {password,code}
GET  /account/devices · DELETE /account/devices/:id · DELETE /account/devices/all
```

**MFA details:**

- TOTP written by hand on `node:crypto` (RFC 6238, SHA-1, 30 seconds,
  6 digits, ±1 step of tolerance).
- `matchCounter` returns the step that matched. A code is refused when its step
  is ≤ `mfa_last_counter`, so every code works once.
- The challenge is AES-256-GCM under `APP_KEY` over `{uid, at, pw: a digest of
  the password hash}`, valid 5 minutes. A password change voids every
  challenge still in flight. It is not stored in the database.
- The setup QR code is drawn **locally** in the browser (the `qrcode` package,
  imported only when setup starts) and never sent to a third-party service.

**Frontend:**

- `api.ts` is the only place that calls `fetch`. It sets
  `Authorization: Bearer`, unwraps the envelope, emits `auth:unauthorized` on a
  401, and de-duplicates identical GETs in flight. Pages read through SWR
  hooks keyed by the endpoint. No `credentials: 'include'`.
- Cookie `auth_key` = JSON `{v, user, token}` (SameSite=Lax); `device_token`
  in a separate cookie. **Browsers cap a cookie at 400 days**, so "never
  expires" is done by rewriting both cookies with a 400-day lifetime on every
  load. The trap goes in `RULES.md` §6.
- The SPA trusts the stored user on load and never calls `/me`; a dead token
  surfaces as the 401 on the first request.
- `useAuth` provides `login`, which returns `{ mfaRequired, challenge }`, plus
  `verifyMfa`, `register`, `logout`, and the 401 listener.
- `ProtectedRoute` / `PublicOnlyRoute` read the cookie. They are only a UX
  hint; the real gate is the server.
- `/login` has three steps: email → password → MFA code; the MFA step replaces
  the form instead of stacking under it. `/signup`. `/forgot-password` (email,
  authenticator code, new password). `/settings` (password, MFA setup and
  disable with a QR code, trusted browsers, sign out). Every page but Login is
  a lazy chunk.

---

## 4. Design system

The Haptive guideline, applied from the first screen:

| Element | Value |
|---|---|
| Colour | yellow `#FEBA33` (brand), canvas `#F5F6F7`, cream `#FDF5E4` (soft), black for dark cards and the bar, white for cards |
| Type | Urbanist; heading 32px, title 24px, body 16px |
| Spacing | multiples of 4px (4–32) |
| Shapes | buttons, tabs and inputs are full pills; cards have large radii |
| Components | `ui.tsx`: buttons with a pending spinner, fields with their error, segmented tabs, cards, alerts, the red-bin confirm dialog; hand-drawn SVG icons, no icon package |

---

## 5. Order of work

1. Documentation (§1), and the skills under `.claude/skills/`.
2. Backend scaffold, the schema migration, the auth and account modules with
   their tests, the backend image.
3. Frontend: the design system, `api.ts`, `useAuth`, route guards, auth and
   settings pages, with their tests, and the frontend image.
4. `compose.yml`, the `secrets` service, `README.md`, the `.env.example` files.
5. Verification (§6). Commit only when asked.

---

## 6. Verification

- `docker compose up --build` from a clean checkout: secrets generated, MySQL
  and Redis healthy, the backend applies the migrations and then listens, the
  frontend opens.
- **Backend tests** (`docker compose run --rm --build backend-test`,
  `node:test` with `app.inject` against a MySQL test database):
  - register, login, identify;
  - wrong password → 422;
  - revoked token → 401;
  - a token stays valid with no time limit;
  - the MFA flow (challenge, wrong code, replayed code refused, expired
    challenge, a trusted browser skips the prompt);
  - reset via MFA (an account without MFA is refused, old tokens die);
  - a password change revokes the other tokens;
  - rate limits → 429, shared through Redis;
  - no response ever contains `password_hash` or `mfa_secret`;
  - no built-in `APP_KEY`.
- **Frontend tests** (vitest): `api.ts` unwraps the envelope and emits
  `auth:unauthorized` on a 401; the route guards; the cookie; lazy pages.
- **Manual, in the browser:** sign up → sign out → email-first sign in → turn
  on MFA with an authenticator app → sign in again with a code → reset the
  password with a code.
