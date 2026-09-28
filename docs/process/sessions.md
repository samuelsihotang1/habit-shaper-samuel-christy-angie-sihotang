# Agent sessions

The project was built with Claude Code as the coding agent, directed by one
developer. This file is the working log, phase by phase: the requests that
led to commits, what the agent did with them, and how the result was
verified. Requests are given in English and edited for clarity; the meaning
and the scope of each one are unchanged. Plans approved before a phase are in
the numbered files beside this one.

**How the agent works.** Under `CLAUDE.md`: it reads the map, then only the
document its task names; it ships a test with every change and runs the
suites before reporting; it asks before anything destructive; it commits
only when asked, without an agent attribution trailer.

---

## Phase 1: foundation and authentication

The phase started from the brief. The decisions it was built on, recorded in
the plan (`01-auth-foundation-plan.md`):

| Question | Answer |
|---|---|
| Backend | Fastify + TypeScript on Node 24, run by type stripping |
| Database access | `@fastify/mysql`, SQL in one repository per module, numbered migrations applied on boot |
| Reference for the code | The `fastify` and `react-best-practices` skills, under `.claude/skills/` before the first line of code |
| Documentation | `CLAUDE.md` as the map, numbered `RULES.md`, path-scoped `.claude/rules/`, one `docs/` file per subsystem, a decision log |
| Authentication | Email-first sign-in, TOTP two-factor with trusted browsers, and a password reset proven by the authenticator instead of email; no Google sign-in |
| Session lifetime | None: signed in until sign-out |
| Look | The Haptive habit tracker brand guideline, Urbanist, one phone-width column on every screen |
| Secrets | From `backend/.env` or generated on first boot by a `secrets` service; never a literal in code, tests or `compose.yml`, and `docker compose up` never needs a `.env` |

Work followed the plan's order: the documentation, the skills, the backend
with its tests, the React client with its tests, then Docker Compose and the
README.

| Commit | What |
|---|---|
| `docs: add the documentation system and phase 1 plan` | the map, the rules, the decision log, the plan |
| `chore(claude): add fastify and react-best-practices skills` | the reference every later file follows |
| `feat(auth): add the Fastify backend …` | accounts, sessions, TOTP two-factor, reset, rate limits on Redis, security headers; 53 tests |
| `feat(frontend): add the React app …` | the design system, sign-in, sign-up, reset, settings; 19 tests |
| `chore(docker): run the whole stack with docker compose up` | secrets, MySQL, Redis, backend, nginx; the backend suite in Docker |
