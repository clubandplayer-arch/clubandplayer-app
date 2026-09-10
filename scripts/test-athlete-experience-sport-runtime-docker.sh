#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="phase-5f-experience-postgres-${RANDOM}"
DB_NAME="phase_5f_experience_sport_runtime"

command -v docker >/dev/null 2>&1 || { echo "Missing required command: docker" >&2; exit 1; }
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run --detach --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -v "$ROOT_DIR:/repo:ro" postgres:16 >/dev/null

for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null
docker exec "$CONTAINER" createdb -U postgres "$DB_NAME"

for file in \
  tests/integration/sql/profile-residence-rpc-runtime-setup.sql \
  tests/integration/sql/profile-primary-sport-runtime-setup.sql \
  tests/integration/sql/athlete-experience-sport-runtime-setup.sql \
  supabase/migrations/20261209120000_athlete_experience_sport_context.sql \
  supabase/migrations/20261209120000_athlete_experience_sport_context.sql \
  tests/integration/sql/athlete-experience-sport-runtime-tests.sql; do
  docker exec "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -q -U postgres -d "$DB_NAME" -f "/repo/$file"
done
