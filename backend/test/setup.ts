// Loaded with `--import` before every test file. Outside Docker the suite reads
// backend/.env and runs against TEST_DATABASE_URL; the test image has no .env
// (.dockerignore), and there compose sets DATABASE_URL itself.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
