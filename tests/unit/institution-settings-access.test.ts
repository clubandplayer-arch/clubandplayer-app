import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const shell = readFileSync('components/shell/AppShell.tsx', 'utf8');
const settings = readFileSync('app/settings/page.tsx', 'utf8');

test('every authenticated role receives desktop and mobile Settings navigation', () => {
  assert.match(shell, /role !== ['"]guest['"][\s\S]*key: ['"]settings['"], label: t\(['"]common\.settings['"]\), href: ['"]\/settings['"]/);
  assert.match(shell, /<Link\s+href=['"]\/settings['"][\s\S]*t\(['"]common\.settings['"]\)/);
  assert.doesNotMatch(shell, /!isInstitution[\s\S]{0,160}href=['"]\/settings['"]/);
});

test('Institution can reach account controls without receiving mobility interests', () => {
  assert.match(settings, /settings\.deleteAccount/);
  assert.match(settings, /accountType === ['"]athlete['"] \|\| accountType === ['"]staff['"]\) \? <GeographicInterestsForm \/> : null/);
});
