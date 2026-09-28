# Habit Shaper

A lightweight web app for building positive habits and breaking negative ones,
through daily tracking and streaks. What is built so far is in
[`PRD.md`](PRD.md).

**Stack:** React 19 + Vite + Tailwind (frontend) · Node.js 24 + TypeScript +
Fastify + `@fastify/mysql` (backend) · MySQL 9.7 · Docker Compose.

---

## Run it

The only requirement is **Docker with the Compose plugin** (Docker Desktop, or
Docker Engine + `docker compose`). No Node.js or MySQL on your machine.

```bash
git clone https://github.com/samuelsihotang1/habit-shaper-samuel-christy-angie-sihotang habit-shaper
cd habit-shaper
docker compose up --build
```

Open **http://localhost:8080** and create an account.

The first start builds the images, generates the secrets and initialises
MySQL, which takes a minute or two. The backend applies the database migrations by itself before it
starts serving, so there is nothing to run by hand.

| Task | Command |
|---|---|
| Start in the background | `docker compose up --build -d` |
| Follow the logs | `docker compose logs -f` |
| Stop | `docker compose down` |
| Stop and **delete all data** | `docker compose down -v` |
| Run the backend tests | `docker compose run --rm --build backend-test` |
| Use another port | `APP_PORT=8090 docker compose up --build` |

## Configuration

Nothing to configure for a first run: no secret is committed or defaulted,
and any you do not set is generated on first boot into the `secrets` Docker
volume. Each part has its own settings file, read both by Docker and when
you run it without Docker. To choose your own values, copy a template and
fill in a line:

```bash
cp backend/.env.example backend/.env     # APP_KEY, database, log level
cp frontend/.env.example frontend/.env   # where `npm run dev` sends /api
cp .env.example .env                     # APP_PORT only
```

To read the generated `APP_KEY` (back it up):
`docker compose run --rm secrets cat /secrets/app_key`.

| Variable | File | Default | What it is |
|---|---|---|---|
| `APP_PORT` | `.env` | `8080` | Port on your machine the app is served on |
| `APP_KEY` | `backend/.env` | generated on first boot | Secret that encrypts two-factor secrets. Any long random string. **Changing it later disables every account's two-factor sign-in** |
| `MYSQL_DATABASE` | `backend/.env` | `habit_shaper` | Database name |
| `MYSQL_USER` | `backend/.env` | `habit` | Database user the app connects as |
| `MYSQL_PASSWORD` | `backend/.env` | generated on first boot | Its password. Letters and digits only |
| `MYSQL_ROOT_PASSWORD` | `backend/.env` | generated on first boot | MySQL root password (also used by the test runner) |
| `LOG_LEVEL` | `backend/.env` | `info` | Backend log level |
| `DATABASE_URL`, `TEST_DATABASE_URL`, `PORT`, `HOST` | `backend/.env` | none, none, `3000`, `127.0.0.1` | Without Docker only; Docker sets its own |
| `BACKEND_URL` | `frontend/.env` | `http://localhost:3000` | Where `npm run dev` forwards `/api` |

MySQL reads the `MYSQL_*` values only when it creates its data volume. To
apply new ones to an existing install, run `docker compose down -v` (this
deletes the data and the generated secrets) and start again.

## Features

- **Accounts**: register and sign in with email and password; no email
  verification. You stay signed in until you sign out.
- **Two-factor authentication** with any authenticator app (Google
  Authenticator, 1Password, Authy…), with "don't ask again on this browser".
- **Password reset with your authenticator code**: available when two-factor
  authentication is on. There is no email in this app.
- **Build habits**: mark a day done (today, or back-dated on the habit's
  calendar), see the current and best streak and each week's completion rate
  and missed days.
- **Break habits**: a clean streak that counts up by itself (day 1, 2, 3 …);
  logging a relapse restarts it.
- **Goals**: add, edit and remove goals, each linked to one habit, measured by
  its streak against a target in days.

## Local development without Docker (optional)

Needs Node.js 24 and a MySQL 8+ or MariaDB 11+ you can reach, with two
databases, `habit_shaper` and `habit_shaper_test`. Copy `backend/.env.example`
to `backend/.env` and set `APP_KEY`, `DATABASE_URL` and, for `npm test`,
`TEST_DATABASE_URL`; every command below reads it when it starts, and
`npm run dev` restarts when it changes. To share two-factor secrets with the Docker install, use
its `APP_KEY` (`docker compose run --rm secrets cat /secrets/app_key`).

```bash
cd backend
npm install
npm run migrate            # applies backend/migrations/*.sql
npm run dev                # http://localhost:3000/api
npm test

cd ../frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :3000
npm test
```

## Documentation

| For | Read |
|---|---|
| Anyone changing the code, human or AI | [`CLAUDE.md`](CLAUDE.md), the map of the rest |
| The API, sessions and two-factor | [`docs/architecture/api.md`](docs/architecture/api.md) |
| Containers and environment | [`docs/architecture/deployment.md`](docs/architecture/deployment.md) |
| Why things are the way they are | [`docs/decisions.md`](docs/decisions.md) |
| Security model | [`docs/security.md`](docs/security.md) |
| How the project was built, step by step | [`docs/process/`](docs/process/) |
