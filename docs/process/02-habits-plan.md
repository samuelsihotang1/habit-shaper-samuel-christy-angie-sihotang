# Plan 2: habits, streaks and goals

## Context

Phase 1 is done: authentication, the design system and the stack. This phase
builds every core feature of the brief on them: build habits, break habits
and goals, with their screens.

Decisions taken before starting:

| Question | Answer |
|---|---|
| Development | Everything local without Docker: backend `npm run dev`, frontend `npm run dev`, a local MariaDB on 3306 (`backend/.env`). Docker must still work for the submission |
| Whose "today" | The browser's time zone, sent as `?tz=` on every habit and goal request; the server never uses its own clock for a day |
| First day of the week | Monday, so the week strip and the weekly rate agree |
| Out of scope from the reference | Premium, social sign-in, reminders and stock photos (`PRD.md`) |

## Screen mapping

| Reference | Habit Shaper |
|---|---|
| Today (week strip, Evening/All Day tabs, habit cards with +1) | Today: week strip, Build/Break tabs, habit cards with Done / Relapsed |
| New Habit, Essential | Habit form: name, type, icon, start date |
| Manage Habits + delete dialog | Habit list, delete (archive) behind the dialog |
| — | Habit detail: streak hero, weekly completion, a month calendar to back-date |
| Explore (card grid) | Goals: a card grid with progress |
| Setting, Account | Settings, from phase 1, gains "Manage habits" |

## Backend

- Tables `habits`, `habit_logs`, `goals` are already in `0001_initial.sql`;
  `docs/architecture/habits.md` describes how they are read.
- `lib/dates.ts`, `lib/streaks.ts`: pure functions (days as `YYYY-MM-DD`,
  streaks, clean streaks, the weekly rate). Streaks are computed from the log
  on every read, never stored.
- Routes: `GET/POST /habits`, `GET/PUT/DELETE /habits/:id`,
  `PUT/DELETE /habits/:id/logs/:date`, `GET/POST /goals`,
  `PUT/DELETE /goals/:id`, each with its TypeBox schemas, service and
  repository. The time zone comes from the browser as `?tz=`.
- Tests: unit tests for the streak rules, integration tests per route, and
  cross-tenant cases (404).

## Frontend

- `TabShell`: the phone column over the black tab bar: Today, Goals,
  Settings. Forms and details keep `AppShell` with a back arrow.
- `useHabits`, `useGoals`: SWR reads keyed by endpoint, and writes that put
  the API's answer into the cache. Today stays in the main bundle; every
  other new page is a lazy chunk.
- The habit icon set, each on its accent circle, kept equal to the backend's
  list.
- Tests: `?tz=` on reads and check-ins, a relapse that asks first, the edit
  form starting from the loaded habit, a new goal linking the first habit.
