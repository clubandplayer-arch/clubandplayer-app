import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const preflight = readFileSync(new URL('docs/european-expansion/phase-5f-g-production-promotion-preflight.md', root), 'utf8');
const mineRoute = readFileSync(new URL('app/api/applications/mine/route.ts', root), 'utf8');
const meRoute = readFileSync(new URL('app/api/applications/me/route.ts', root), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as { scripts: Record<string, string> };
const vercel = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')) as Record<string, string>;

test('5F-G classifies both Preview warnings without changing their unrelated sources', () => {
  assert.equal(mineRoute.trim(), "export { runtime, GET } from '../me/route';");
  assert.match(meRoute, /export const runtime = 'nodejs'/);
  assert.match(preflight, /Ignored build scripts: esbuild/);
  assert.match(preflight, /warning non bloccante/);
  assert.match(preflight, /non è introdotto dal delta 5F/);
});

test('5F-G proves the deployment command contains no automatic database apply', () => {
  assert.equal(vercel.installCommand, 'pnpm install --frozen-lockfile');
  assert.equal(vercel.buildCommand, 'pnpm run build');
  assert.equal(packageJson.scripts.build, 'next build --turbopack');
  const automaticCommands = [vercel.installCommand, vercel.buildCommand, packageJson.scripts.build].join('\n');
  assert.doesNotMatch(automaticCommands, /supabase|migrat|seed|psql/i);
  assert.match(preflight, /Non esistono hook `vercel-build`, `prebuild`, `postbuild`/);
});

test('5F-G keeps pending 5D-C outside the 5F promotion and records a clear PASS', () => {
  assert.match(preflight, /5D-C non è prerequisito del deploy 5F/);
  assert.match(preflight, /Nessun seed o backfill è richiesto/);
  assert.match(preflight, /PASS: il candidato `36dfa9860d9d12f5373ea3a85d76f706b4d718a4` è pronto/);
  assert.match(preflight, /Non esistono blocker pre-deploy identificati/);
  assert.match(preflight, /Non eseguire migration, seed, merge o canary/);
});
