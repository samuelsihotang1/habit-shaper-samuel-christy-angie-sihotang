#!/bin/sh
# Loads each secret from the file its *_FILE variable names (the `secrets`
# volume, scripts/generate-secrets.sh), then runs the stage's CMD.
set -e
if [ -n "${APP_KEY_FILE:-}" ]; then APP_KEY=$(cat "$APP_KEY_FILE"); export APP_KEY; fi
if [ -n "${DATABASE_URL_FILE:-}" ]; then DATABASE_URL=$(cat "$DATABASE_URL_FILE"); export DATABASE_URL; fi
if [ -n "${REDIS_URL_FILE:-}" ]; then REDIS_URL=$(cat "$REDIS_URL_FILE"); export REDIS_URL; fi
if [ -n "${TEST_REDIS_URL_FILE:-}" ]; then TEST_REDIS_URL=$(cat "$TEST_REDIS_URL_FILE"); export TEST_REDIS_URL; fi
exec "$@"
