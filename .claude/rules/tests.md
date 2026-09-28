---
paths:
  - "backend/test/**"
  - "frontend/test/**"
---

# Testing

How the suites run is `CLAUDE.md` §1. That every edit ships with its test is
`CLAUDE.md` §3. This file is how to write one.

| Side | Lives in | Runs against |
|---|---|---|
| Backend | `backend/test/*.test.ts`, `node:test` + `node:assert/strict` | a real MySQL (`habit_shaper_test`) through `app.inject`, no HTTP port |
| Frontend | `frontend/test/*.test.{ts,tsx}` | jsdom, with `fetch` stubbed by `vi.stubGlobal` |

- **Frontend:** render every page inside `FreshCache` from `test/support.tsx`.
  SWR's default cache lives for the whole file, so without it one test's
  answers render in the next with no request. Pass it `cache={new Map()}` to
  read what a write left there.

- **Write the test so it fails first.** Break the guard, watch it go red,
  restore. A test never seen red may assert something that merely happens to
  hold.
- **Assert what a person would notice**: the status, the `code`, whether the
  old token still works. Not an internal call count.
- **Backend:** `useApp()` from `test/helpers.ts` migrates the test database
  once, then gives each test a fresh app (so fresh in-memory rate limits:
  `REDIS_URL` stays empty in tests) over emptied tables, and refuses to run unless
  `DATABASE_URL` names a test database. Files run one at a time
  (`--test-concurrency=1`) because they share that database.
- Every protected endpoint gets an unauthenticated case; every user-owned row
  gets a cross-tenant case (someone else's id answers 404).
- **TOTP in tests:** `totp(secret, steps)` from the helpers. `registerWithMfa`
  spends step −1, so a test uses step 0 then +1 for its next codes. A test
  that crosses a 30-second boundary between computing and sending a code can
  still land inside the ±1 window, which is why no test uses −1 after setup.
- Time for the challenge TTL is moved with
  `mock.timers.enable({ apis: ['Date'] })` from `node:test`: only the clock,
  because Fastify and the database driver still need real timers to answer.

## Where a rule already has a guard, name the guard

| Guard | What it holds |
|---|---|
| `auth.test.ts` "never sends the password hash or the MFA secret" | `RULES.md` §1.3 |
| `mfa.test.ts` "accepts each code once" | the `mfaLastCounter` anti-replay in `AccountService.consumeCode` |
| `mfa.test.ts` "can be listed and removed, but never someone else's" | `RULES.md` §1.2 for devices |
| `config.test.ts` "has no built-in APP_KEY" | secrets only from the environment (`docs/decisions.md`) |
| `auth.test.ts` "has no expiry" | sessions live until logout (`docs/decisions.md`) |
| `password.test.ts` "kills a challenge issued before the reset" | the password fingerprint in `lib/challenge.ts` |
| `frontend/test/api.test.ts` | the `api.ts` contract: envelope, `ApiError`, the 401 event, GET de-dupe |
| `frontend/test/routes.test.tsx` | the guards, no `/me` on load, signing out on a server 401, and both sign-outs emptying the SWR cache |
| `habits.test.ts` "never shows, logs, edits or deletes someone else's habit" | `RULES.md` §1.2 for habits and their logs |
| `goals.test.ts` "never edits or deletes someone else's goal" | `RULES.md` §1.2 for goals |
| `streaks.test.ts` | streak, clean streak and weekly rules (`docs/architecture/habits.md`) |
| `stats.test.ts` "never counts someone else's habits" | `RULES.md` §1.2 for statistics |
| `auth.test.ts` "stores the password as an argon2id hash" | argon2id with the parameters in `lib/password.ts` |
| `habits.test.ts` "refuses a request without a session before it reads the body" | `app.authenticate` runs `onRequest`, before validation |
| `validation.test.ts` | every route-schema sentence, `normalize` before length checks, the `$data` confirmation, response schemas dropping unlisted keys |
| `plugins.test.ts` | the errors plugin alone: refusal codes as written, the 422 shape, `Retry-After`, a flat 500 |
| `limits.test.ts` | per-IP buckets count malformed requests, login counts per address after validation, a bucket shared by name, and (Docker only, `TEST_REDIS_URL`) counts shared through Redis |
| `hardening.test.ts` | helmet headers, gzip over 1 KiB, the 64 KiB body limit, the 503 from under-pressure, redacted logs |
| `config.test.ts` "refuses a port or a log level it cannot use" | `env-schema` validation in `src/config.ts` |
| `frontend/test/today.test.tsx` | `?tz=` on reads and check-ins; a relapse asks first; a revisited Today draws from the cache; only the saving card spins |
| `frontend/test/forms.test.tsx` | the edit form starts from the loaded habit (keyed reset); a new habit joins the cached list; a new goal links the first habit |
| `frontend/test/ui.test.tsx` | `ConfirmDialog` keeps focus on a parent render, and Escape calls the latest `onCancel` |
| `frontend/test/lazy.test.tsx` | the tab bar stays while a page chunk loads; a lazy page renders; a tab preloads on focus; `qrcode` loads only after "Turn on" |
| `frontend/test/cookies.test.ts`, `dates.test.ts` | the cookie cache and its version; formatters cached per option set |
