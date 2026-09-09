import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const plan = readFileSync(new URL('../../docs/european-expansion/phase-5f-f-profile-primary-sport-canary-plan.md', import.meta.url), 'utf8');
const experiencesRoute = readFileSync(new URL('../../app/api/profiles/me/experiences/route.ts', import.meta.url), 'utf8');
const profileForm = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');

test('5F-F canary plan records authorization while remaining not executed', () => {
  for (const prerequisite of ['deploy', 'account canary', 'snapshot', 'ripristino', 'autorizzazione esplicita']) {
    assert.match(plan, new RegExp(prerequisite, 'i'));
  }
  assert.match(plan, /CANARY AUTORIZZATO MA NON ESEGUITO/);
  assert.match(plan, /TEARDOWN VERIFICATION PENDING/);
});

test('5F-F records the canonical-domain post-deploy PASS without reopening deploy work', () => {
  assert.match(plan, /Checkpoint post-deploy dominio canonico.*PASS USER-REPORTED/s);
  assert.match(plan, /hasUrl=true/);
  assert.match(plan, /hasAnon=true/);
  assert.match(plan, /mode=production/);
  assert.match(plan, /build, deploy e migration non devono essere ripetuti/i);
  assert.match(plan, /Questo PASS non autorizza il canary/);
});

test('5F-F stops at one disposable identity before any combined canary write', () => {
  assert.match(plan, /un solo account Production già esistente/);
  assert.match(plan, /auth\.users\.id/);
  assert.match(plan, /non comunicare email, password, token/);
  assert.match(plan, /un PATCH Profile/);
  assert.match(plan, /un PATCH di sostituzione esperienze/);
});

test('5F-F records qualification, disposable attestation and the narrow authorization', () => {
  assert.match(plan, /QUALIFICATION_EXIT_CODE=0/);
  assert.match(plan, /fittizio, dedicato ai test ed eliminabile/);
  assert.match(plan, /un PATCH Profile, una sostituzione atomica delle esperienze/);
  assert.match(plan, /Qualificazione, build, deploy e migration non devono essere ripetuti/);
});

test('5F-F resolves the experiences method discrepancy from the distributed commit', () => {
  assert.match(plan, /Metodo effettivo esperienze — PATCH, non PUT/);
  assert.match(plan, /esporta `GET` e `PATCH`; non esporta `PUT`/);
  assert.match(plan, /replace_my_athlete_experiences\(jsonb\)/);
  assert.match(plan, /405 Method Not Allowed/);
  assert.match(experiencesRoute, /export const PATCH = withAuth/);
  assert.doesNotMatch(experiencesRoute, /export const PUT/);
  assert.match(experiencesRoute, /rpc\('replace_my_athlete_experiences'/);
  assert.match(profileForm, /profiles\/me\/experiences[\s\S]*method: 'PATCH'/);
});

test('5F-F stops Step 1 after loading the secret without an HTTP request', () => {
  assert.match(plan, /read -rsp 'CANARY_TOKEN: '/);
  assert.match(plan, /PHASE_5F_CANARY_SECRET_READY/);
  assert.match(plan, /non eseguire ancora `curl`/i);
  assert.match(plan, /non incollare il token in chat/i);
});

test('5F-F Step 2 captures two authenticated GET baselines without writing or leaking data', () => {
  assert.match(plan, /Checkpoint Step 1.*PASS USER-REPORTED/s);
  assert.match(plan, /set \+u/);
  assert.match(plan, /umask 077/);
  assert.match(plan, /api\/profiles\/me"\)/);
  assert.match(plan, /api\/profiles\/me\/experiences"\)/);
  assert.match(plan, /PROFILE_STATUS.*!= '200'/s);
  assert.match(plan, /EXPERIENCES_STATUS.*!= '200'/s);
  assert.match(plan, /PHASE_5F_CANARY_BASELINE_HTTP_PASS/);
  assert.match(plan, /non incollare i JSON o il token/);
  const step2 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 2 soltanto'), plan.indexOf('## Esecuzione guidata — Step 3 Profile completo'));
  assert.doesNotMatch(step2, /-X PATCH|--request PATCH|method: 'PATCH'/);
});

test('5F-F Step 3 pins baselines and performs one Profile PATCH with fail-closed comparisons', () => {
  assert.match(plan, /Checkpoint Step 2.*PASS USER-REPORTED/s);
  assert.match(plan, /7646c11e47c833ca306a125ad399733d0bb15ee884a5d015472bed91415850f5/);
  assert.match(plan, /5f804c35bbaa20fbb75d111c4b6936820e95c6c813fb7544bd5bd2400b7c29e9/);
  const step3 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 3 Profile completo'), plan.indexOf('## Esecuzione guidata — Step 4 esperienze completo'));
  assert.equal((step3.match(/--request PATCH/g) ?? []).length, 1);
  assert.match(step3, /\{sport: \$sport\}/);
  assert.match(step3, /cmp -s/);
  assert.match(step3, /PHASE_5F_CANARY_PROFILE_PASS/);
  assert.match(step3, /PHASE_5F_CANARY_STOP profile_comparison/);
  assert.doesNotMatch(step3, /api\/profiles\/me\/experiences"\)"[\s\S]*--request PATCH/);
  assert.doesNotMatch(step3, /--request DELETE|-X DELETE|\/experiences[^\n]*--request PATCH/);
});

test('5F-F Step 4 performs one atomic experiences PATCH and preserves Profile', () => {
  assert.match(plan, /Checkpoint Step 3.*PROFILE PASS USER-REPORTED/s);
  assert.match(plan, /c98e964fdb6dfde8b1db811ad4de2be229d53747394193401a2815be55a2d4f1/);
  assert.match(plan, /7d78ae8e3f697e6bd3c10edef77eb21eca8ad5e2b89585739fdaa0adcfadf97d/);
  const step4 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 4 esperienze completo'), plan.indexOf('## Esecuzione guidata — Step 5 consolidamento evidenze read-only'));
  assert.equal((step4.match(/--request PATCH/g) ?? []).length, 1);
  assert.match(step4, /api\/profiles\/me\/experiences/);
  assert.match(step4, /del\(\.primarySport\)/);
  assert.match(step4, /EXPERIENCES_PATCH_RESPONSE/);
  assert.match(step4, /PHASE_5F_CANARY_EXPERIENCES_PASS/);
  assert.match(step4, /PHASE_5F_CANARY_STOP experiences_comparison/);
  assert.doesNotMatch(step4, /--request DELETE|-X DELETE/);
});

test('5F-F Step 5 consolidates existing evidence without remote operations or teardown', () => {
  assert.match(plan, /Checkpoint Step 4.*EXPERIENCES PASS USER-REPORTED/s);
  assert.match(plan, /0364b47208d3b9ad9bb85869a24d889be8a58e1de38adc0a99090f03fc6ca372/);
  assert.match(plan, /cc039a4f595fbba7f76280e1e1929790946dce5baffe014843c0386a3580c2a5/);
  const step5 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 5 consolidamento evidenze read-only'), plan.indexOf('## Esecuzione guidata — Step 6 teardown ordinario'));
  assert.match(step5, /PHASE_5F_CANARY_FINAL_READ_ONLY_PASS/);
  assert.match(step5, /evidence_owner_or_side_effect/);
  assert.doesNotMatch(step5, /curl|psql|--request|-X (?:PATCH|POST|PUT|DELETE)|supabase/);
});

test('5F-F Step 6 invokes the ordinary owner-scoped teardown exactly once without retry', () => {
  assert.match(plan, /Checkpoint Step 5.*FINAL READ-ONLY PASS USER-REPORTED/s);
  const step6 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 6 teardown ordinario'), plan.indexOf('## Informazioni ancora strettamente necessarie'));
  assert.equal((step6.match(/--request DELETE/g) ?? []).length, 1);
  assert.match(step6, /api\/account\/delete/);
  assert.match(step6, /EXPECTED_CANARY_USER_ID='b5ba567a-194b-4e07-afe7-f8f9ce29a808'/);
  assert.match(step6, /PHASE_5F_CANARY_TEARDOWN_REQUEST_PASS/);
  assert.doesNotMatch(step6, /for |while |until |--retry|profiles\/me\/experiences/);
});

test('5F-F Step 7 verifies teardown residue through a read-only report', () => {
  assert.match(plan, /Checkpoint Step 6.*TEARDOWN REQUEST PASS USER-REPORTED/s);
  const step7 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 7 verifica read-only del teardown'), plan.indexOf('## Informazioni ancora strettamente necessarie'));
  assert.match(step7, /phase-5f-canary-teardown-verification-read-only\.sql/);
  assert.match(step7, /PHASE_5F_CANARY_TEARDOWN_VERIFIED/);
  assert.doesNotMatch(step7, /curl|--request DELETE|supabase db/);
});

test('5F-F Step 7 has a no-network recovery diagnostic that does not print the database URL', () => {
  const step7 = plan.slice(plan.indexOf('## Esecuzione guidata — Step 7 verifica read-only del teardown'), plan.indexOf('## Informazioni ancora strettamente necessarie'));
  assert.match(step7, /PHASE_5F_CANARY_STEP7_LOCAL_READINESS/);
  assert.match(step7, /PRODUCTION_DATABASE_URL:-/);
  assert.doesNotMatch(step7, /echo "\$PRODUCTION_DATABASE_URL"|printf[^\n]*PRODUCTION_DATABASE_URL/);
});

test('5F-F Step 7 records the missing DB secret and reloads it through hidden input only', () => {
  assert.match(plan, /db_secret=missing baseline=present psql=present report=present/);
  assert.match(plan, /read -rsp 'PRODUCTION_DATABASE_URL \(input nascosto\): '/);
  assert.match(plan, /PHASE_5F_CANARY_STEP7_DB_SECRET_READY/);
  assert.match(plan, /izzfjrcabtixxsrnkzro/);
  assert.doesNotMatch(plan, /export PRODUCTION_DATABASE_URL=['"]postgres/);
});

test('5F-F records the proposed Staff account and stops on the privileged read-only report', () => {
  assert.match(plan, /b5ba567a-194b-4e07-afe7-f8f9ce29a808/);
  assert.match(plan, /Staff con ruolo legacy `Fotografo`/);
  assert.match(plan, /QUALIFICAZIONE TECNICA PENDING/);
  assert.match(plan, /phase-5f-canary-account-qualification-read-only\.sql/);
  assert.match(plan, /PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING/);
  assert.match(plan, /prossimo singolo dato necessario è la cella JSON/i);
});

test('5F-F selects Production and pins the reviewed runtime revision', () => {
  assert.match(plan, /ambiente proposto è \*\*Production\*\*/);
  assert.match(plan, /ad9862991d9d6d3c8992796c976601e6e3f917ea/);
  assert.match(plan, /c65da3e070c1274049b9ebc2382884fd10e7f909/);
  assert.match(plan, /36dfa9860d9d12f5373ea3a85d76f706b4d718a4/);
  assert.match(plan, /verify-phase-5f-runtime-release\.sh/);
  assert.match(plan, /Preview resta non verificato/);
});

test('5F-F records the Codespace pass and rejects the older Production deployment', () => {
  assert.match(plan, /PASS USER-REPORTED/);
  assert.match(plan, /RELEASE_VERIFY_EXIT_CODE=0/);
  assert.match(plan, /NEW DEPLOY REQUIRED/);
  assert.match(plan, /772a45bb6b279409da48ffb08ad39510bf359651/);
  assert.match(plan, /https:\/\/www\.clubandplayer\.com/);
  assert.match(plan, /izzfjrcabtixxsrnkzro/);
  assert.match(plan, /non è utilizzabile per il canary/);
});

test('5F-F records deploy authorization without broadening it and gives a fail-closed handoff', () => {
  assert.match(plan, /AUTORIZZATO \/ NON ESEGUITO/);
  assert.match(plan, /Promote to Production/);
  assert.match(plan, /Source commit.*36dfa9860d9d12f5373ea3a85d76f706b4d718a4/s);
  assert.match(plan, /Se lo SHA non compare.*fermarsi/s);
  assert.match(plan, /comunicare soltanto l'URL immutabile del deployment/);
  assert.match(plan, /non viene estesa a commit diversi, merge, migration o canary/);
});

test('5F-F uses only a disposable profile and accounts for trigger side effects', () => {
  assert.match(plan, /profilo di test dedicato e disposable/);
  assert.match(plan, /profilo reale.*è escluso/);
  for (const effect of ['updated_at', 'profile_visibility_status', 'notifica', 'role', 'location', 'moderazione']) {
    assert.match(plan, new RegExp(effect, 'i'));
  }
  assert.match(plan, /nove trigger/);
  assert.match(plan, /teardown/);
});

test('5F-F defines executable commands and stop conditions without executing them', () => {
  for (const command of ['curl --fail-with-body', '-X PATCH']) assert.ok(plan.includes(command));
  assert.match(plan, /Fermarsi senza retry/);
  assert.match(plan, /non usare `supabase db push`, migration repair/);
});

test('5F-F scopes the canary to the atomic primary-sport group and stable errors', () => {
  for (const field of ['sport', 'sport_id', 'sport_discipline_id', 'sport_variant_id']) {
    assert.ok(plan.includes(field));
  }
  for (const code of ['invalid_reference', '400', '403', '500']) assert.ok(plan.includes(code));
  assert.match(plan, /owner-scoped/);
});

test('5F-F does not mistake reset for restoration of a legacy-only baseline', () => {
  assert.match(plan, /reset API come rollback/i);
  assert.match(plan, /sport="Calcio".*riferimenti canonici null/);
  assert.match(plan, /profilo.*disposable/i);
  assert.match(plan, /non sarà eseguito alcun backfill/i);
});
