# Habits, streaks and goals

How habits, check-ins, streaks, the weekly rate and goals work. The routes
are in `api.md`; the pure logic is `backend/src/lib/streaks.ts` and
`backend/src/lib/dates.ts`, pinned by `backend/test/streaks.test.ts`.

---

## The model

The columns, keys and cardinalities are the ERD in `schema.md`.

| Table | Holds |
|---|---|
| `habits` | `user_id`, `name`, `type` (`build` \| `break`), `icon`, `started_on` (date), `archived_at?` |
| `habit_logs` | `habit_id`, `date` (a calendar day, no time), one row per habit per day, unique on the pair |
| `goals` | `user_id`, `habit_id`, `title`, `target_days?`, `notes?`, `archived_at?` |

**Streaks are computed from the log, never stored.** A stored counter and the
log beside it can disagree, and then one of them is wrong with no way to tell
which. Computing from the log makes a relapse, an undo, or a back-dated check
a single row change. Every habit response carries its whole log (`logs`), its
`stats` and, for a build habit, the last 8 `weeks`.

`icon` is a key from a fixed list, kept equal in
`backend/src/modules/habits/schemas.ts` and `frontend/src/components/icons.tsx`.
The type cannot change after creation: a log row means "done" for one type and
"relapsed" for the other.

## What a log row means

| Habit type | A `habit_logs` row on a day means | `current_streak` |
|---|---|---|
| `build` | done that day | consecutive done days ending today, or ending yesterday while today is not done yet |
| `break` | **relapsed** that day | clean days: day 1 on `started_on`, counting up by itself; 0 on the day of a relapse, day 1 the day after |

A clean streak needs no check-in; a relapse is the one event worth recording.
`longest_streak` is the best run of either kind anywhere in the log. A day can
be logged only between `started_on` and today (`habits.dateOutOfRange`).

## Weekly completion (build habits)

For each ISO week (Monday–Sunday) since `started_on`: `days` that counted,
`done`, `missed = days − done`, and `rate = done ÷ days`. Days before
`started_on` never count. **Today is still open**, as in the streak: it counts
once it is done and is never a missed day, so an unchecked morning does not
read as a failure. The habit screen shows these weeks.

## Statistics

`GET /api/stats?period=` adds up every active habit of the user
(`backend/src/modules/stats/`), with the same counting rules as the weekly rate:

| Period | Buckets, oldest first |
|---|---|
| `week` | the last 7 days, one per day |
| `month` | the last 30 days, one per day |
| `year` | the last 12 calendar months, one per month |

Each bucket carries the build habits' `days`, `done`, `missed` and `rate`, and
the break habits' `relapses`; `total` adds the buckets up. Because today counts
only once it is done, today's own bucket reads 100% after the first check-in,
so the Statistics page draws today's column as done out of every build habit,
as the Today screen does.

## Whose "today"

A day is a calendar date in the **user's time zone**. The SPA sends it on every
habits and goals request as `?tz=` (`Intl.DateTimeFormat().resolvedOptions().timeZone`,
`frontend/src/services/habits.ts`); the server computes today with `todayIn(tz)`
and never from its own clock. A check-in at 23:30 in Jakarta is the Jakarta date,
whatever UTC says. An unknown zone is a 422; no `tz` means UTC.

## Goals

A goal belongs to one habit of either type, and to the same user
(`goals.habitNotFound` for anyone else's). Its progress is the habit's current
streak against `target_days`; a goal without a target is open-ended. Removing a
goal deletes it. Deleting a habit archives it **and** its goals rather than
deleting rows: a check-in log is user data.
