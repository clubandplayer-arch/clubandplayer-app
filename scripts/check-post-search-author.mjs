#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const POST_NO_ID_DEFAULT = 'e8fab306-a856-4a91-a4b7-273e8fa33e06';
const CLUB_TARGET_DEFAULT = 'ASD Volley Carlentini';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const postId = argValue('--post-id') || POST_NO_ID_DEFAULT;
const expectedClubName = argValue('--expected-club') || CLUB_TARGET_DEFAULT;
const fixAuthorId = argValue('--fix-author-id') || null;
const apply = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-post-search-author.mjs [--post-id <uuid>] [--expected-club "ASD Volley Carlentini"] [--fix-author-id <profile_uuid>] [--apply]');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('--- Step 1/2: post row ---');
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, author_id, created_at, kind, content')
    .eq('id', postId)
    .maybeSingle();

  if (postError) {
    console.error('posts query error:', postError.message);
    process.exit(1);
  }
  if (!post) {
    console.error('post not found:', postId);
    process.exit(1);
  }

  console.log(JSON.stringify(post, null, 2));

  const authorId = post.author_id;
  if (!authorId) {
    console.error('post.author_id is null/empty -> data issue');
    process.exit(2);
  }

  console.log('\n--- Step 3: author_id resolution checks ---');

  const [{ data: pById, error: pByIdErr }, { data: pByUser, error: pByUserErr }, { data: clubById, error: clubErr }, { data: athleteById, error: athleteErr }] = await Promise.all([
    supabase.from('profiles').select('id, user_id, full_name, display_name, avatar_url, account_type, type').eq('id', authorId).maybeSingle(),
    supabase.from('profiles').select('id, user_id, full_name, display_name, avatar_url, account_type, type').eq('user_id', authorId).maybeSingle(),
    supabase.from('clubs_view').select('id, display_name, avatar_url, sport, status').eq('id', authorId).maybeSingle(),
    supabase.from('athletes_view').select('id, full_name, avatar_url, sport, status').eq('id', authorId).maybeSingle(),
  ]);

  if (pByIdErr) console.error('profiles(id) error:', pByIdErr.message);
  if (pByUserErr) console.error('profiles(user_id) error:', pByUserErr.message);
  if (clubErr) console.error('clubs_view(id) error:', clubErr.message);
  if (athleteErr) console.error('athletes_view(id) error:', athleteErr.message);

  console.log('profiles.id = author_id =>', JSON.stringify(pById, null, 2));
  console.log('profiles.user_id = author_id =>', JSON.stringify(pByUser, null, 2));
  console.log('clubs_view.id = author_id =>', JSON.stringify(clubById, null, 2));
  console.log('athletes_view.id = author_id =>', JSON.stringify(athleteById, null, 2));

  const matched = Boolean(pById || pByUser || clubById || athleteById);
  if (!matched) {
    console.log('\nNo canonical match found for author_id. Looking up expected club...');
    const { data: expectedClubRows, error: expectedErr } = await supabase
      .from('clubs_view')
      .select('id, display_name, avatar_url, sport, status')
      .ilike('display_name', `%${expectedClubName}%`)
      .order('display_name', { ascending: true })
      .limit(10);

    if (expectedErr) {
      console.error('expected club lookup error:', expectedErr.message);
    } else {
      console.log('Expected club candidates:', JSON.stringify(expectedClubRows || [], null, 2));
    }
  }

  if (fixAuthorId) {
    console.log('\n--- Proposed fix ---');
    console.log(`UPDATE public.posts SET author_id = '${fixAuthorId}' WHERE id = '${postId}';`);

    if (apply) {
      const { data: updated, error: updErr } = await supabase
        .from('posts')
        .update({ author_id: fixAuthorId })
        .eq('id', postId)
        .select('id, author_id')
        .maybeSingle();

      if (updErr) {
        console.error('update error:', updErr.message);
        process.exit(3);
      }
      console.log('updated row:', JSON.stringify(updated, null, 2));
    } else {
      console.log('Dry run only. Pass --apply to execute update.');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
