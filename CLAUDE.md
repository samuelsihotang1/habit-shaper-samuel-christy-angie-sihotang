# CLAUDE.md — Read This First

**Habit Shaper** is a small web app for building good habits and breaking bad
ones: daily check-ins, streaks, clean streaks, weekly completion, and goals
linked to habits. The scope we hold ourselves to is `PRD.md`.

- **Backend** — Node 24, TypeScript 7, Fastify 5, `@fastify/mysql`, MySQL 9.7 → `backend/`
- **Frontend** — React 19, TypeScript, Vite, Tailwind v4, react-router, SWR → `frontend/`
- **Runtime** — `compose.yml`: `db`, `redis` (rate limits), `backend`, `frontend` (nginx serving the SPA and proxying `/api`)

**This file is the map, not the manual.** It holds what every task needs. The
conventions for the files you are about to touch load on their own from
`.claude/rules/` when you open a file they cover. Read the one row of §2 your
task names, and stop there.

---

## 1. Commands

Run from the repository root unless the row says otherwise.

| Command | What it does |
|---|---|
| `docker compose up --build` | the whole stack on `http://localhost:${APP_PORT:-8080}`; migrations run on backend boot; secrets generated on first boot |
| `docker compose down` / `down -v` | stop / stop **and delete the database volume** |
| `docker compose run --rm --build backend-test` | backend suite (`node:test`) against the `habit_shaper_test` database |
| `npm test` (in `backend/`) | the same suite outside Docker, against `TEST_DATABASE_URL` in `backend/.env` |
| `docker compose logs -f backend` | API logs (JSON, pino) |
| `npm run typecheck` (in `backend/` or `frontend/`) | `tsc --noEmit`; the only real type check on either side |
| `npm test` (in `frontend/`) | frontend suite, vitest + jsdom, no server needed |
| `npm run build` (in `frontend/`) | `tsc` + `vite build` |
| `npm run migrate` (in `backend/`) | applies every new `backend/migrations/*.sql` to `DATABASE_URL`; a migration is a new numbered file |
| `mysql -uroot -p habit_shaper < db/demo.sql` | the demo account: a year of habits, relapses and goals, dated from today; rerunning replaces it. Sign-in is in the file's header |

**Allowed without asking**: typecheck, both test suites, `build`, `docker
compose up/build/logs/ps`, `down` without `-v`. **Ask first**: `down -v` or
anything else that deletes the database volume, `npm install` of a new
package. Say which command you are about to run before running it.

**On the development VPS** Docker needs `sudo`, and port 8080 is taken: run
the stack with `sudo APP_PORT=8090 docker compose up -d --build`.

---

## 2. Where to read next

One row, not the folder.

| Your task | Read, in this order |
|---|---|
| before your first edit, whatever it is | `RULES.md` §1 |
| an endpoint, the envelope, an error code, auth, MFA, sessions | `docs/architecture/api.md` |
| habits, check-ins, streaks, weekly rate, goals | `docs/architecture/habits.md` |
| compose, Dockerfiles, env vars, migrations on boot, nginx | `docs/architecture/deployment.md` |
| stack, repository layout, known gaps | `docs/architecture/README.md` |
| colour, spacing, components, states | `docs/design/README.md` |
| a threat, a rate limit, what the API must never send | `docs/security.md` |
| is this feature in scope | `PRD.md` |
| reversing something, or wondering why it is like this | `docs/decisions.md` |
| a symptom you cannot explain | `RULES.md` §6, the traps |
| how the project got here | `docs/process/` |

**`RULES.md` is a reference, not a reading.** It is numbered so code can point
into it: a comment saying `RULES.md §6` means open that section. Grep the
heading, read the section, stop.

There is no schema document. The schema is `backend/migrations/*.sql`, in order.

**If the docs and the code disagree, the code wins.** Then fix the doc.

---

## 3. Non-negotiables

1. **Never break tenant scoping.** Every read and write of a user's rows is
   filtered by `userId` from `request.auth` in the same query. A stranger's
   row and a missing row answer the same 404. (`RULES.md` §1.2)
2. **Never send a database row.** Every response shape goes through a
   serializer in `backend/src/modules/*/serialize.ts`. (`RULES.md` §1.3)
3. **Every edit ships with its test, and you say which.** The exceptions are a
   copy tweak, a pure comment, or an existing test that covers it *by name*.
   Run the suites before reporting anything done and paste the real result.
4. **Never destroy user data.** No migration drops or renames a populated
   column without a data step.
5. **Don't add dependencies** without proposing them first. (`RULES.md` §1.4)
6. **Stay in scope.** Don't refactor adjacent code or fix unrelated bugs you
   spotted; report them.
7. **Update the affected document in the same change**, but only when a
   future session would get it wrong without the note. How to write it is §4.
8. **Secrets come from `.env` or are generated on first boot**
   (`scripts/generate-secrets.sh`). No key, password or token as a literal or
   a default in code, tests or `compose.yml`, not even a "dev only" one, and
   never a required `.env`: `docker compose up` must work on a fresh clone.
   (`docs/decisions.md`)

---

## 4. Writing documentation and comments

The same rules apply to a `.md` file and to a comment.

### Write only what the reader cannot get from the code

1. **What a dependency, browser or tool actually does.** The code never tells you.
2. **A decision with a live alternative**: why this and not the obvious
   other thing, and what breaks if it is reversed. One or two sentences.
3. **A trap**: something that already cost time.
4. **A contract between two files** that no type enforces, written at both ends.

Everything else is noise: restating the line below, narrating history, or
repeating a rule that already lives in `RULES.md`.

### Write what is true now

A reason is what a thing buys, never what it replaced. A sentence naming what
something used to be only says that somebody already fixed it; delete the old
side. A reversal worth remembering is a row in `docs/decisions.md` saying
*don't*.
No names and no dates. A decision stands on its reason.

### The library rule

When an API does not do what its name says, write it down in one line: the
API, what the name implies, what it actually does, and how that was
established. The test for whether a fact belongs: **could someone recover it
by reading our own code?** If it took reading `node_modules`, a response
header, or a browser's behaviour, then no. Write it once, as a row in
`RULES.md` §6.

### Where a fact goes

| Kind of fact | Home |
|---|---|
| What a dependency really does | `RULES.md` §6, one row |
| Why a decision was made | `docs/decisions.md`, one row |
| How a subsystem works | the one `docs/architecture/` file that owns it |
| A convention for a whole file type | `.claude/rules/`, the file whose `paths` match |
| A contract between two lines of code | a comment at the line |
| What the code does | nowhere; the code says it |

A comment is at most a short paragraph, a file header at most about ten lines.
Prefer a table row to a paragraph. **If a comment in a file you are editing is
now false, fix or delete it in the same change.**
