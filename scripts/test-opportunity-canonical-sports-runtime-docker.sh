#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="phase-5g-opportunity-postgres-${RANDOM}"
DB_NAME="phase_5g_opportunity_runtime"

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
  tests/integration/sql/canonical-sports-competition-schema-setup.sql \
  supabase/migrations/20261206120000_canonical_sports_competition_schema.sql \
  tests/integration/sql/opportunity-canonical-sports-runtime-setup.sql \
  supabase/migrations/20261210120000_opportunity_canonical_sports_context.sql \
  tests/integration/sql/opportunity-canonical-sports-runtime-tests.sql; do
  docker exec "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -q -U postgres -d "$DB_NAME" -f "/repo/$file"
done

