# Process

How the project was planned, built and delivered. The brief asks to see how
the result was reached, not only the result; this folder is that record. The
rules the agent worked under are the rest of the repository's agent layer:
`CLAUDE.md`, `RULES.md`, `.claude/rules/` and `.claude/skills/`.

| File | What it is |
|---|---|
| `sessions.md` | The working log: each request that led to a commit, what the agent did, and how it was verified |
| `01-auth-foundation-plan.md` | The plan approved before phase 1, as approved |
| `02-habits-plan.md` | The plan approved before phase 2, as approved |
| `03-statistics-demo-review.md` | Phase 3, which grew out of review: requests, decisions, verification, and the audit against the brief |

A plan is kept as it was approved, so some of it may later change; what
applies now is in `docs/decisions.md` and `docs/architecture/`. **When a plan
and the code disagree, the code wins.**

## Phases

Every commit message says why the change was made, what it contains, and how
it was verified; `git log` is the long form of this table.

| # | Phase | Record | Outcome |
|---|---|---|---|
| 1 | Documentation system, the Fastify and React skills, the design system, authentication (email-first sign-in, TOTP two-factor, reset by authenticator), Docker Compose | `01-auth-foundation-plan.md` | 53 backend + 19 frontend tests |
| 2 | Habits, check-ins, streaks, weekly rate, goals, and their screens | `02-habits-plan.md` | 86 backend + 32 frontend tests |
| 3 | Week / Month / Year statistics, demo data, the audit against the brief | `03-statistics-demo-review.md` | 91 backend + 34 frontend tests |
| 4 | Delivery: goal presets, the demo sign-in in the README, brand guidelines and a new logo, WCAG AA contrast, phone viewport fixes, the live app, the ERD and system diagrams | `sessions.md` | 91 backend + 65 frontend tests |
