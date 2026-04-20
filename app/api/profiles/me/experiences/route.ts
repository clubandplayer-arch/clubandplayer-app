import { type NextRequest, NextResponse } from 'next/server';

import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import {
  ensurePastExperienceCategory,
  isPastExperienceComplete,
  isPastExperienceEmpty,
  parseSeasonLabel,
  sanitizePastExperience,
  type PastExperience,
} from '@/lib/profiles/pastExperiences';

export const runtime = 'nodejs';

function sortBySeasonDescending(a: PastExperience, b: PastExperience) {
  const parsedA = parseSeasonLabel(a.season);
  const parsedB = parseSeasonLabel(b.season);
  const startA = parsedA?.startYear ?? 0;
  const startB = parsedB?.startYear ?? 0;
  return startB - startA;
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:EXPERIENCES:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) return jsonError(profileError.message, 400);
  if (!profile?.id) return NextResponse.json({ data: [] });

  const { data, error } = await supabase
    .from('athlete_experiences')
    .select('club_name, sport, category, start_year, end_year')
    .eq('profile_id', profile.id)
    .order('start_year', { ascending: false })
    .order('end_year', { ascending: false });

  if (error) return jsonError(error.message, 400);

  const experiences = (data || [])
    .map((item) => {
      const startYear = item.start_year;
      const endYear = item.end_year;
      if (typeof startYear !== 'number' || typeof endYear !== 'number' || endYear !== startYear + 1) {
        return null;
      }
      return ensurePastExperienceCategory(
        sanitizePastExperience({
          season: `${startYear}/${String(endYear % 100).padStart(2, '0')}`,
          club: item.club_name || '',
          sport: item.sport || '',
          category: item.category || '',
        }),
      );
    })
    .filter((value): value is PastExperience => Boolean(value))
    .sort(sortBySeasonDescending);

  return NextResponse.json({ data: experiences });
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:EXPERIENCES:PATCH:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = (await req.json().catch(() => ({}))) as { experiences?: unknown };
  const rawExperiences = Array.isArray(body.experiences) ? body.experiences : [];
  const experiences: PastExperience[] = [];

  for (let index = 0; index < rawExperiences.length; index += 1) {
    const value = rawExperiences[index];
    const sanitized = sanitizePastExperience((value || {}) as Record<string, unknown>);
    if (isPastExperienceEmpty(sanitized)) continue;
    const normalized = ensurePastExperienceCategory(sanitized);
    if (!isPastExperienceComplete(normalized)) {
      return jsonError(`Compila tutti i campi dell'esperienza #${index + 1}.`, 400);
    }
    const parsedSeason = parseSeasonLabel(normalized.season);
    if (!parsedSeason) {
      return jsonError(`Seleziona una stagione valida per l'esperienza #${index + 1}.`, 400);
    }
    experiences.push(normalized);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) return jsonError(profileError.message, 400);
  if (!profile?.id) return jsonError('Profilo non trovato.', 404);

  const { error: deleteError } = await supabase
    .from('athlete_experiences')
    .delete()
    .eq('profile_id', profile.id);

  if (deleteError) return jsonError(deleteError.message, 400);

  if (experiences.length > 0) {
    const rows = experiences
      .map((experience) => {
        const season = parseSeasonLabel(experience.season);
        if (!season) return null;
        return {
          profile_id: profile.id,
          club_name: experience.club,
          sport: experience.sport,
          category: experience.category,
          start_year: season.startYear,
          end_year: season.endYear,
          is_current: false,
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('athlete_experiences').insert(rows);
      if (insertError) return jsonError(insertError.message, 400);
    }
  }

  return NextResponse.json({ data: experiences });
});
