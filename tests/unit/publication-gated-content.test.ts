import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('feed reads and writes require a published author profile', () => {
  const posts = readFileSync('app/api/feed/posts/route.ts', 'utf8');
  assert.match(posts, /status === 'active' && profile\.profile_visibility_status === 'published'/);
  assert.match(posts, /rows = rows\.filter\(\(row: any\) => isPublishedFeedAuthor/);
  assert.match(posts, /Completa e pubblica il profilo prima di creare post/);
});

test('single post reads do not expose draft authors to other users', () => {
  const post = readFileSync('app/api/feed/posts/[id]/route.ts', 'utf8');
  assert.match(post, /if \(!isOwner && !isPublishedAuthor\(authorProfile\)\)/);
  assert.match(post, /return notFoundError\('Post non trovato'\)/);
});

test('comments and opportunities reject unpublished profiles', () => {
  const comments = readFileSync('app/api/feed/comments/route.ts', 'utf8');
  const opportunities = readFileSync('app/api/opportunities/route.ts', 'utf8');
  assert.match(comments, /Completa e pubblica il profilo prima di commentare/);
  assert.match(comments, /filter\(\(c\) => isPublishedInteractionProfile/);
  assert.match(opportunities, /clubProfile\.profile_visibility_status !== 'published'/);
  assert.match(opportunities, /club_profile_must_be_published/);
});
