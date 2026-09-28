# RULES.md — Conventions & Guardrails

Rules for anyone touching this codebase. A few decisions here are
load-bearing and look arbitrary from outside. Read §1 before your first edit.

**How to read this file.** It is numbered so code can point into it: a comment
saying `RULES.md §6` means open that section, not the file. Sections that live
in `.claude/rules/` keep their number here as a signpost.

---

## 1. Hard rules

### 1.1 Verify your own work, within what was granted

The command table, and what may run without asking, is `CLAUDE.md` §1. A
migration is a deliverable first: write it correctly before running it.

### 1.2 Never break tenant scoping

A list or bulk write is `where: { userId }` with the id from `request.auth`.
A single row is fetched or changed with **both** its id and that `userId` in
the same query (`DELETE … WHERE id = ? AND user_id = ?`, then 404 on 0 rows
touched). Never a lookup by id followed by an ownership `if`: the second step
is the one that gets forgotten.

### 1.3 Never send a database row

Responses are built by `serializeUser`, `serializeDevice` and their
siblings. A row sent as-is ships `password_hash`, `mfa_secret` and whatever
column is added next. `backend/test/auth.test.ts` asserts the register
response carries neither.

### 1.4 Don't add dependencies

`package.json` holds what `src/` imports, nothing more. TOTP is
`backend/src/lib/totp.ts`, forms are plain React state, and each backend
package is there for a rule of the Fastify skill (`docs/decisions.md`). If you
genuinely need a package, propose it with what it replaces.

### 1.5 Don't touch these without a specific reason

| Area | Why |
|---|---|
| `frontend/src/services/api.ts` | The single fetch chokepoint: Bearer header, envelope unwrap, the 401 event |
| The `{ success, data, message }` envelope | The whole frontend unwraps exactly this |
| `backend/src/lib/crypto.ts` key derivation | Changing it makes every stored MFA secret unreadable |
| `APP_KEY` in a running deployment | Same: every MFA account is locked out (§6) |

---

## 2. Backend conventions

→ `.claude/rules/backend.md`. Loads on its own with any file under `backend/src/` or `backend/migrations/`.

## 3. Frontend conventions

→ `.claude/rules/frontend.md`. Loads on its own with any file under `frontend/src/`.

## 4. Design rules

→ `docs/design/README.md`.

---

## 5. Multi-file changes: the checklists

**A new endpoint**: TypeBox request and response schemas in
`modules/<area>/schemas.ts` → service
method (and its SQL in the repository) → route in `modules/<area>/routes.ts`,
behind `app.authenticate` unless it is public → serializer for the response → a test in
`backend/test/` including the unauthenticated case and, for user rows, the
cross-tenant case → the route table in `docs/architecture/api.md` → the
service function in `frontend/src/services/`.

**A column**: a new `backend/migrations/NNNN_<what>.sql` (never edit one that
has run) → the repository's column list and row type → the serializer, if the
client needs it → the type in `frontend/src/types/`.

**A signed-in page**: `pages/<area>/<Name>Page.tsx`, reading through a hook
in `hooks/` → a `React.lazy` export in `pages/lazy.ts` (and a `byPath` entry if
a link preloads it) → a `<Route>` inside `<ProtectedRoute>` and `<AppShell>` in `App.tsx`.

**A new error code**: a `refusal(...)` class in `backend/src/lib/errors.ts`, thrown
where it applies → list it
in `docs/architecture/api.md` → branch on `error.code` in the page only if the
page must behave differently, not just show the message.

---

## 6. Known traps

Each of these cost time once already.

### Backend and infrastructure

| Trap | |
|---|---|
| Fastify refuses an **empty body sent with `Content-Type: application/json`** | 400 "Body cannot be empty when content-type is set to 'application/json'" (observed against this API). `api.ts` therefore sends `{}` on every POST/PUT without a body |
| `APP_KEY` encrypts every MFA secret | change it and no MFA account can sign in or reset. There is no rotation path yet |
| `@fastify/mysql` sounds like it passes its options to the pool | with `connectionString` set it hands `mysql2` the string alone and drops every other option (`node_modules/@fastify/mysql/index.js`). `poolOptions()` in `src/db.ts` passes the URL as `uri` instead |
| A `DATE` column read by `mysql2` sounds like a calendar day | it arrives as a `Date` at midnight in the process's zone, which can print as the day before. The pool reads `DATE` as strings (`dateStrings: ['DATE']`) |
| `createError('auth.wrongPassword', …)` from `@fastify/error` sounds like it keeps the code | it calls `code.toUpperCase()` (`node_modules/@fastify/error/index.js`), so the wire would say `AUTH.WRONGPASSWORD`. `refusal()` in `lib/errors.ts` sets the code back |
| `Type.Union(list.map((x) => Type.Literal(x)))` in TypeBox sounds like a union of the list | the mapped array is no longer a tuple, so its `Static` type is `never` and every handler answering with it fails the type check (observed). Use `Type.Enum(list)` |
| `--env-file-if-exists` / `process.loadEnvFile` sound like they set the environment | neither overrides a variable already set (observed on Node 24), so compose's values win over a stray `.env` |
| A Tailwind class later in `className` sounds like it wins over an earlier one | the order in the stylesheet decides, not the order in the attribute: `text-danger` after a variant's `text-ink` stayed black. Give the case its own variant (`danger-soft` in `ui.tsx`) |
| An argon2 hash string starts with its parameters | every hash here begins `$argon2id$v=19$m=65536,t=3,p=4$`, so a prefix identifies nothing. The challenge fingerprint digests the whole hash (`lib/challenge.ts`) |
| MySQL runs first-boot init with networking off | a socket `mysqladmin ping` passes before the real server is up; the compose healthcheck pings over TCP |
| `db/init/*.sql` runs only when the `db-data` volume is empty | a volume created before a new init file never gets it. For `habit_shaper_test`: `docker compose exec db mysql -uroot -p -e 'CREATE DATABASE habit_shaper_test'` |
| Fastify's `trustProxy` walks X-Forwarded-For from the right, skipping trusted hops | with `loopback,uniquelocal` any caller on a private network is itself trusted, so it can choose its own `request.ip` (see `docs/security.md` §2) |
| Outside Docker the rate limits count in memory | with `REDIS_URL` empty a restart clears them, and two processes count separately. Compose always sets it |
| `@fastify/rate-limit`'s `config.rateLimit` sounds like a counter per key | it keeps one per key **per route** (the store's `child` adds the route's method and URL), so `groupId` alone cannot share a bucket across routes. `plugins/rate-limit.ts` keeps one `createRateLimit` checker per bucket name instead |
| A Redis key from `createRateLimit` reads `habit-shaper:limit:undefinedundefined-login:…` | `createRateLimit` builds its store with an empty `routeInfo`, and `RedisStore.child` writes its method and URL into the key anyway (`node_modules/@fastify/rate-limit`). Harmless: the bucket's own key follows |

### React and SWR

| Trap | |
|---|---|
| `mutate` exported by `swr` sounds like it writes the app's cache | it writes SWR's default cache only; under `<SWRConfig provider>`, as every test renders, it misses. `useCache()` in `hooks/useData.ts` takes the bound `mutate` from `useSWRConfig()` |

### nginx and the browser

| Trap | |
|---|---|
| One `add_header` inside a `location` drops **every** `add_header` inherited from `server {}` | nginx docs, `ngx_http_headers_module`: headers are inherited "if and only if there are no add_header directives defined on the current level". Cache headers in `frontend/nginx.conf` use `expires` for that reason |
| A cookie cannot outlive 400 days | Chrome clamps `Expires`/`Max-Age` to 400 days (RFC 6265bis draft). "Never expires" is done by rewriting the cookie on every load (`refreshAuthCookies`) |
| `credentials: 'include'` on an API with no cookie sessions | buys nothing; the token travels in `Authorization` |
| A Vite SPA 404s on every route but `/` without a fallback | nginx `try_files $uri /index.html` |

---

## 7. Git

Conventional Commits:

```
feat(auth): add MFA sign-in challenge
fix(api): answer malformed JSON with 400
docs(architecture): document the session model
```

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`. Scopes: `auth`,
`account`, `habits`, `goals`, `api`, `ui`, `frontend`, `backend`, `docker`,
`docs`.

- Commit or push **only when asked.**
- Never commit `.env`, `node_modules/`, `dist/`, keys or certificates.
- One logical change per commit.

## 8. Testing

→ `.claude/rules/tests.md`. Loads on its own with any file under `backend/test/` or `frontend/test/`.
