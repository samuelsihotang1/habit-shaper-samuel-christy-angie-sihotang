# PRD — Habit Shaper

What is in scope and what is not: the requirement.

---

## Who it is for

One person tracking their own habits. There is no sharing, no social feed, no
coach, and no admin role.

## Features

| # | Feature | Status |
|---|---|---|
| 1 | **Accounts**: register and sign in with email + password, no email verification | planned |
| 1a | Email-first sign-in (`/login` asks for the address, then the password) | planned |
| 1b | Two-factor authentication with an authenticator app (TOTP), trusted browsers | planned |
| 1c | Password reset proven by an authenticator code (no email in this stack) | planned |
| 1d | Change password, sign out; a session never expires on its own | planned |
| 2 | **Build habits**: create one, mark it done for a day, current streak, weekly completion rate and days missed per week | planned |
| 3 | **Break habits**: create one, clean streak (day 1, 2, 3 …), relapse resets it | planned |
| 4 | **Goals**: add, edit, remove; each linked to one habit of either type | planned |


## Non-functional requirements (from the brief)

- Web app, **lightweight**: a simple, clean theme (`docs/design/README.md`),
  after the Haptive habit tracker brand guideline: one phone-width column on
  every screen size.
- React frontend, Node.js + TypeScript backend, MySQL.
- `docker compose up` from the repository root runs everything; nothing else
  installed but Docker. The schema bootstraps itself on first boot.
- Commit everything, including process artifacts (`docs/process/`); never
  `node_modules`, build output or real secrets. `.env.example` +
  `README.md` document every variable.

## Out of scope

- Email of any kind: verification, reset links, reminders.
- Social sign-in (Google or other).
- Notifications and reminders.
- Multiple languages. The UI is English (`docs/decisions.md`).
- A mobile app.
