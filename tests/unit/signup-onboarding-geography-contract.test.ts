import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('signup and profile bootstrap do not collect or default geography', () => {
  const signup = read('app/signup/SignupClient.tsx');
  const bootstrap = read('app/api/profiles/bootstrap/route.ts');

  assert.doesNotMatch(signup, /interest_country|residence_country|residence_geo|geo_area/i);
  assert.doesNotMatch(bootstrap, /interest_country\s*:\s*['"]IT['"]/i);
  assert.doesNotMatch(bootstrap, /residence_country|residence_geo/i);
});

test('role chooser uses the narrow account-type-only endpoint', () => {
  const chooser = read('app/onboarding/choose-role/page.tsx');
  const endpoint = read('app/api/onboarding/role/route.ts');

  assert.match(chooser, /fetch\(['"]\/api\/onboarding\/role['"]/);
  assert.match(chooser, /JSON\.stringify\(\{ account_type: role \}\)/);
  assert.match(endpoint, /key !== ['"]account_type['"]/);
  assert.match(endpoint, /\.update\(\{ account_type: accountType \}\)/);
  assert.doesNotMatch(endpoint, /interest_country|residence_country|residence_geo|geo_area/i);
});

test('/onboarding remains a redirect placeholder rather than a geography wizard', () => {
  const onboarding = read('app/(dashboard)/onboarding/page.tsx');

  assert.doesNotMatch(onboarding, /CanonicalGeographySelector|residence_country|residence_geo|geo_area/i);
});
