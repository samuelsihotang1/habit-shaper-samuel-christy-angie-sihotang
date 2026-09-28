---
paths:
  - "backend/src/**/*.ts"
  - "backend/migrations/**"
---

# Backend conventions

`RULES.md` §2. Loads when you open a file under `backend/src/` or
`backend/migrations/`. The hard rules are `RULES.md` §1; the traps are §6.

### Layering

```
modules/<area>/routes.ts     a plugin, autoloaded at /api/<area>: { config: { limits }, schema } → app.services.<area> → ok(serialize(...))
modules/<area>/schemas.ts    TypeBox: every request schema, with the user-facing messages, and every response schema
modules/<area>/service.ts    every rule; transactions live here
modules/<area>/repository.ts every SQL statement for the area's tables, tenant filter included
modules/<area>/serialize.ts  ALL response shaping; snake_case keys
lib/                         no Fastify, no database: pure functions a test can call directly
plugins/                     autoloaded, each `fp()` with a `name` and its `dependencies`: config, mysql, redis, rate-limit, errors, auth, services, helmet, compress, under-pressure
```

- **Every route declares `schema`**: `params`, `querystring` and `body` from
  `schemas.ts`, and `response: { 200: Ok(...) }` (`lib/http.ts`). Fastify
  validates before the handler and types `request.body` from it. A message
  goes in `errorMessage`; `normalize: 'trim' | 'lowercase'` cleans a string
  first (`lib/validation.ts`). Never check input by hand in a handler.
- **Refuse by throwing a class from `lib/errors.ts`** (`throw new EmailTaken()`),
  never `reply.status(422).send(...)`. The error handler owns the envelope.
  A new code is a new `refusal(code, status, message, field?)` there.
- **A write touching more than one table** runs inside `transaction(db, async (tx) => …)`
  from `src/db.ts`, with each repository created on `tx`.
- **Authenticated routes** sit in a plugin whose first line is
  `app.addHook('onRequest', app.authenticate)`, and read the user with
  `authOf(request)`. The hook runs before the body is parsed, so a request
  without a session is a 401 whatever it sends.
- Wire format is **snake_case** (`mfa_enabled`, `device_token`). Columns are
  snake_case too; a repository's column list aliases them to camelCase fields.
- **SQL takes every value as a `?` placeholder.** Only constants in the
  repository name a table or column.
- Every table is snake_case plural, with uuid `CHAR(36)` ids made by
  `randomUUID()`, and `created_at`/`updated_at` where rows change. The backend
  writes every `DATETIME`, in UTC; `DATE` columns are `YYYY-MM-DD` strings.

### Rate limits

A route lists the buckets it spends in `config: { limits: [...] }`; each is a
`Bucket` (`plugins/rate-limit.ts`) with a `name`, `max`, `windowMs` and a
`key(request)`. Key a bucket by what an attacker varies least: email + IP,
email, IP, or user id. Mark it `afterValidation: true` when its key reads the
body; otherwise it counts before validation, malformed requests included.
Routes that name the same bucket share its counters.

### Imports

Node runs `src/` as it is (type stripping): there is no build, and `tsc` only
checks. So imports end in `.ts`, and only erasable TypeScript is allowed
(`erasableSyntaxOnly`): no enums, namespaces or constructor parameter
properties. Imports from `src/` use the `@/` alias, as in the frontend; Node
resolves it through `src/alias.ts`, which every `node` command loads with
`--import ./src/alias.ts`.
