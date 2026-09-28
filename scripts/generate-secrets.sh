#!/bin/sh
# compose.yml's one-shot `secrets` service, run before db and backend. Fills the
# `secrets` volume: the value backend/.env gives wins, otherwise the one already
# there, otherwise a new random one. The other containers read these files (*_FILE).
set -eu
cd /secrets

# Hex: letters and digits only, so a password is safe unescaped in a URL.
random() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

# put <file> <value from backend/.env, may be empty> <random bytes>
put() {
  if [ -n "$2" ]; then printf %s "$2" > "$1"
  elif [ ! -s "$1" ]; then random "$3" > "$1"
  fi
}

put app_key "${APP_KEY:-}" 48
put mysql_password "${MYSQL_PASSWORD:-}" 24
put mysql_root_password "${MYSQL_ROOT_PASSWORD:-}" 24
put redis_password "${REDIS_PASSWORD:-}" 24

MYSQL_USER=${MYSQL_USER:-habit}
MYSQL_DATABASE=${MYSQL_DATABASE:-habit_shaper}
printf %s "$MYSQL_USER" > mysql_user
printf %s "$MYSQL_DATABASE" > mysql_database

printf 'mysql://%s:%s@db:3306/%s' "$MYSQL_USER" "$(cat mysql_password)" "$MYSQL_DATABASE" > database_url
printf 'mysql://root:%s@db:3306/habit_shaper_test' "$(cat mysql_root_password)" > test_database_url
# Database 0 for the app, 1 for the test suite, so a test run never touches live counters.
printf 'redis://:%s@redis:6379/0' "$(cat redis_password)" > redis_url
printf 'redis://:%s@redis:6379/1' "$(cat redis_password)" > test_redis_url

# Read by mysql (uid 999) and node (uid 1000); only containers mounting the volume see them.
chmod 0444 app_key mysql_password mysql_root_password mysql_user mysql_database database_url test_database_url redis_password redis_url test_redis_url
