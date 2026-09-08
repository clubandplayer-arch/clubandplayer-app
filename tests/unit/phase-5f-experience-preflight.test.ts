import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql=readFileSync(new URL('../../scripts/sports/reports/phase-5f-experience-sport-preflight-read-only.sql',import.meta.url),'utf8');

test('experience preflight is one read-only rolled-back JSON report',()=>{
 assert.match(sql,/begin transaction read only;/i);
 assert.equal((sql.match(/select jsonb_pretty\(/gi)??[]).length,1);
 assert.match(sql,/transactionReadOnly/);
 assert.match(sql,/rollback;/i);
});

test('experience preflight covers schema constraints RPC RLS grants and history',()=>{
 for(const token of ['athlete_experiences','candidateKeys','targetConstraints','security_invoker','authenticated_execute','public_execute','policies','20261206120000','20261207120000','20261208120000','20261209120000']) assert.ok(sql.includes(token),token);
});

test('experience preflight distinguishes exclusive apply from unsafe history and collisions',()=>{
 for(const status of ['PASS_READY_EXCLUSIVE_APPLY_WITH_5D_C_PENDING','PASS_READY_TO_APPLY','PASS_ALREADY_APPLIED','BLOCKED_RLS_OR_POLICY','BLOCKED_INCOMPATIBLE_COLLISION','BLOCKED_PARTIAL_OR_HISTORY_DRIFT']) assert.ok(sql.includes(status),status);
 assert.match(sql,/'automaticApplySafeWhen5dCPending',false/);
});

test('experience preflight contains no mutation or explicit locking',()=>{
 const executable=sql.replace(/^--.*$/gm,'');
 assert.doesNotMatch(executable,/\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke)\b\s+(?:table|into|from|public\.|supabase_migrations)/i);
 assert.doesNotMatch(executable,/\b(?:lock table|pg_advisory|db push|migration repair)\b/i);
});
