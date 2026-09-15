#!/usr/bin/env bash
set -euo pipefail

# Read-only gate for the Phase 6 Preview. The bypass value must be injected by
# the caller's secret store; never pass it on the command line or enable xtrace.
: "${VERCEL_AUTOMATION_BYPASS_SECRET:?Inject VERCEL_AUTOMATION_BYPASS_SECRET in the verification environment}"

PREVIEW_URL="${PHASE6_PREVIEW_URL:-https://clubandplayer-app-git-codex-impl-c95c85-clubandplayers-projects.vercel.app}"
EXPECTED_REF="${PHASE6_EXPECTED_SUPABASE_REF:-jbovlevodfouwuvtdlja}"
: "${PHASE6_EXPECTED_DEPLOYMENT_SHA:?Set PHASE6_EXPECTED_DEPLOYMENT_SHA to the SHA shown by Vercel}"

case "$PREVIEW_URL" in
  https://*.vercel.app) ;;
  *) echo "FAIL: PHASE6_PREVIEW_URL must be an https://*.vercel.app URL" >&2; exit 1 ;;
esac

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

get_preview() {
  local path="$1"
  local output="$2"
  curl --silent --show-error --fail-with-body \
    --header "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}" \
    --header "cache-control: no-cache" \
    --output "$output" \
    "${PREVIEW_URL}${path}"
}

get_preview "/api/env" "$tmp_dir/env.json"
node - "$tmp_dir/env.json" "$EXPECTED_REF" "$PHASE6_EXPECTED_DEPLOYMENT_SHA" <<'NODE'
const fs = require('node:fs')
const [file, expectedRef, expectedSha] = process.argv.slice(2)
const value = JSON.parse(fs.readFileSync(file, 'utf8'))
const failures = []
if (value.mode !== 'preview') failures.push('mode is not preview')
if (value.publicProjectRef !== expectedRef) failures.push('public project ref mismatch')
if (value.serverProjectRef !== expectedRef) failures.push('server project ref mismatch')
if (value.serverUrlSource !== 'SUPABASE_URL') failures.push('server URL is using fallback')
if (value.projectRefsMatch !== true) failures.push('public/server project refs differ')
if (value.anonKeysMatch !== true) failures.push('public/server anon credentials differ')
if (value.serviceRoleConfigured !== true) failures.push('service-role is not configured')
if (typeof value.sha !== 'string' || !value.sha.startsWith(expectedSha)) failures.push('deployment SHA mismatch')
if (failures.length) {
  console.error(`FAIL: ${failures.join('; ')}`)
  process.exit(1)
}
console.log(`PASS env: mode=preview ref=${expectedRef} sha=${value.sha.slice(0, 7)} credentials=coherent`)
NODE

# This endpoint exercises the server anon client and the applied taxonomy using
# GET only. Its response is stored temporarily and only invariant results print.
get_preview "/api/sports/catalog" "$tmp_dir/catalog.json"
node - "$tmp_dir/catalog.json" <<'NODE'
const fs = require('node:fs')
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const data = value.data ?? value
const variants = Array.isArray(data.variants) ? data.variants : []
const mappings = Array.isArray(data.legacySports) ? data.legacySports : []
if (!variants.some((item) => item.code === 'seven_a_side')) throw new Error('seven_a_side variant missing')
if (!mappings.some((item) => item.legacyValue === 'Calcio a 7' && item.variantId)) {
  throw new Error('Calcio a 7 legacy mapping missing')
}
console.log('PASS catalog: seven_a_side variant and Calcio a 7 mapping present')
NODE

# A deliberately non-matching public registry GET exercises the configured
# service-role client without printing records or credentials.
get_preview "/api/registry/clubs/search?q=phase6-isolation-probe-no-match" "$tmp_dir/registry.json"
node - "$tmp_dir/registry.json" <<'NODE'
const fs = require('node:fs')
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (value.ok !== true || !Array.isArray(value.items)) throw new Error('service-role GET probe failed')
console.log('PASS service-role: read-only Preview registry probe succeeded')
NODE

echo "PHASE6_PREVIEW_READ_ONLY_GATE_PASS"
