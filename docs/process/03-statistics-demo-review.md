# Phase 3: statistics, demo data, and the review against the brief

Phase 3 came out of reviewing phase 2 in the browser against the brief and
the reference. This file records what was asked, what was decided, and how
each part was verified.

## Requests

| # | Request | Result |
|---|---|---|
| 1 | A Statistics screen with Week, Month and Year buttons, like the reference, and they must work | A server endpoint per period, and the screen with three tabs |
| 2 | A SQL file of demo data for one account, covering every feature as fully as possible | `db/demo.sql` |
| 3 | Check the project against the brief: is anything missing? | Audit below; every requirement met |

## Decisions

| Question | Decision | Why |
|---|---|---|
| What do Week, Month and Year show | The last 7 days by day, the last 30 days by day, the last 12 calendar months by month | Each range gets the bucket a reader expects; a Year of weekly columns would be 52 unreadable bars |
| Where the periods are added up | The server, `GET /api/stats?period=` | The counting rules (today open, days before the start ignored) live in `lib/streaks.ts`; a second copy in the browser would drift |
| Today's column | Drawn as today's progress, done out of every build habit | The API counts today only once done, so today's own bucket would read 100% after the first check-in |
| Missed days per week, across habits | Kept per habit on the habit screen, not on Statistics | The brief's "how many days were missed per week" is met per habit; Statistics shows the chosen period |
| A period change | The last period stays on screen, dimmed, until the next answers | The charts never blank between tabs |
| Demo dates | Relative to `CURDATE()` | The data is current whenever it is loaded, and stays deterministic (CRC32 of habit and day) |
| Demo password in the repository | Allowed, recorded in `docs/decisions.md` | Loaded by hand, never on boot; `docker compose up` still starts with no account |

## Verification

| What | How | Result |
|---|---|---|
| Stats endpoint | `backend/test/stats.test.ts`: buckets, totals, 401, 422, cross-tenant | 91 backend tests pass; the cross-tenant test was seen failing with the user filter removed |
| Stats screen | `frontend/test/stats.test.tsx`: each tab's request and column count, the dimmed previous period | 34 frontend tests pass |
| Stats in use | The demo account's `GET /api/stats` for each period, through nginx | 7, 30 and 12 buckets, each with its totals |
| Demo data | Loaded twice into MySQL 9.7 | Idempotent: the second load replaces the account |
| The brief, end to end | Fresh checkout, `docker compose up --build` on its own project name and port, driven through nginx | Stack healthy, migrations applied on first boot; register, login, a build habit checked in, a break habit with a relapse, a goal added, edited and removed, statistics; backend suite in Docker |

## Audit against the brief

| Requirement | Where it is met |
|---|---|
| Create build habits | `POST /api/habits`, `pages/habits/HabitFormPage.tsx` |
| Mark a habit done for each day | `PUT /api/habits/:id/logs/:date`; Today and the back-dating calendar |
| Streaks | `buildStreak`, `longestBuildStreak` in `lib/streaks.ts` |
| Weekly completion rate and missed days per week | `weeklySummary`; the habit screen's weekly list; Statistics |
| Create break habits | the same form, type `break` |
| Clean streak: Day 1, Day 2, … | `cleanStreak`; "Day N clean" on Today |
| Reset on a relapse | a relapse log makes the clean streak 0 that day, Day 1 the next |
| Add, edit and remove goals | `/api/goals` CRUD; `pages/goals/` |
| A goal is linked to a build or break habit | `goals.habit_id`; progress is that habit's current streak against the target |
| Web app, simple and clean | the Haptive guideline, `docs/design/README.md` |
| React, Node.js with TypeScript, MySQL | React 19; Fastify 5 on Node 24; MySQL 9.7 |
| Register and log in with email and password, no verification | `/api/register`, `/api/login` |
| One `docker compose up`, no local runtime | `compose.yml`; secrets generated on first boot |
| Migrations run on first boot | the backend image runs `src/migrate.ts` before the server |
| No `node_modules`, build output or secrets committed; `.env.example`; variables and commands in `README.md` | `.gitignore`; three `.env.example` files; README "Run it" and "Configuration" |
| Commit the development artifacts | `CLAUDE.md`, `RULES.md`, `.claude/`, and this folder |
