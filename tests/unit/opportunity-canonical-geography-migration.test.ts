import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationPath =
  'supabase/migrations/20261205120000_opportunity_canonical_geography.sql';
const migrationSql = readFileSync(migrationPath, 'utf8');

test('C3 migration adds nullable canonical Opportunity geography without defaults', () => {
  assert.match(
    migrationSql,
    /alter table public\.opportunities[\s\S]*add column if not exists country_id uuid[\s\S]*add column if not exists geo_area_id uuid/i,
  );
  assert.doesNotMatch(migrationSql, /country_id uuid\s+not null|geo_area_id uuid\s+not null/i);
  assert.doesNotMatch(migrationSql, /default\s+['"]?IT['"]?/i);
});

test('C3 migration enforces direct and same-country foreign keys with restricted deletes', () => {
  assert.match(
    migrationSql,
    /constraint opportunities_country_fk[\s\S]*foreign key \(country_id\)[\s\S]*references public\.countries\(id\)[\s\S]*on delete restrict/i,
  );
  assert.match(
    migrationSql,
    /constraint opportunities_geo_area_fk[\s\S]*foreign key \(geo_area_id\)[\s\S]*references public\.geo_areas\(id\)[\s\S]*on delete restrict/i,
  );
  assert.match(
    migrationSql,
    /constraint opportunities_geo_country_required_check[\s\S]*check \(geo_area_id is null or country_id is not null\)/i,
  );
  assert.match(
    migrationSql,
    /constraint opportunities_geo_country_fk[\s\S]*foreign key \(geo_area_id, country_id\)[\s\S]*references public\.geo_areas\(id, country_id\)[\s\S]*on delete restrict/i,
  );
});

test('C3 migration indexes both canonical filters and remains transactionally idempotent', () => {
  assert.match(migrationSql, /^begin;/im);
  assert.match(migrationSql, /commit;\s*$/i);
  assert.match(
    migrationSql,
    /create index if not exists opportunities_country_id_idx\s+on public\.opportunities \(country_id\)/i,
  );
  assert.match(
    migrationSql,
    /create index if not exists opportunities_geo_area_id_idx\s+on public\.opportunities \(geo_area_id\)/i,
  );
  assert.equal((migrationSql.match(/add column if not exists/gi) ?? []).length, 2);
  assert.equal((migrationSql.match(/drop constraint if exists/gi) ?? []).length, 4);
});

test('C3 migration contains no data, RLS, ownership, application or legacy mutation', () => {
  const executableSql = migrationSql
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  assert.doesNotMatch(executableSql, /\b(insert into|update|delete from|truncate)\b/i);
  assert.doesNotMatch(executableSql, /\b(create|alter|drop)\s+policy\b|row level security|\bgrant\b|\brevoke\b/i);
  assert.doesNotMatch(executableSql, /\b(create|alter|drop)\s+(trigger|function)\b/i);
  assert.doesNotMatch(executableSql, /\b(owner_id|created_by|club_id|applications)\b/i);
  assert.doesNotMatch(executableSql, /\b(regions|provinces|municipalities|legacy_geo_area_mappings)\b/i);
});
