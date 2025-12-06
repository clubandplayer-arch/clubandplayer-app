import { NextRequest } from 'next/server';
import {
  notAuthenticated,
  notFoundError,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { normalizeProfileSkills, normalizeSkillName } from '@/lib/profiles/skills';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Action = 'endorse' | 'remove';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: profileId } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return notAuthenticated();

  if (!profileId) return validationError('Id profilo mancante');

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const skillNameRaw = normalizeSkillName((body as any)?.skillName);
  const action = typeof (body as any)?.action === 'string' ? ((body as any).action as Action) : null;

  if (!skillNameRaw) return validationError('Nome competenza non valido', { code: 'SKILL_NOT_FOUND' });
  if (action !== 'endorse' && action !== 'remove') return validationError('Azione non valida');
  if (profileId === user.id) {
    return validationError('Non puoi endorsare te stesso', { code: 'SELF_ENDORSE_NOT_ALLOWED' });
  }

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, skills')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError) return unknownError({ endpoint: 'endorseSkill', error: profileError });
    if (!profileRow) return notFoundError('Profilo non trovato');

    const skillList = normalizeProfileSkills(profileRow.skills ?? []);
    const targetSkill = skillList.find((s) => s.name.toLowerCase() === skillNameRaw.toLowerCase());
    if (!targetSkill) {
      return validationError('Competenza non trovata', { code: 'SKILL_NOT_FOUND' });
    }

    if (action === 'endorse') {
      const { error: upsertError } = await supabase
        .from('profile_skill_endorsements')
        .upsert({
          profile_id: profileId,
          endorser_profile_id: user.id,
          skill_name: targetSkill.name,
        });

      if (upsertError) return unknownError({ endpoint: 'endorseSkill', error: upsertError });
    } else {
      const { error: deleteError } = await supabase
        .from('profile_skill_endorsements')
        .delete()
        .eq('profile_id', profileId)
        .eq('endorser_profile_id', user.id)
        .eq('skill_name', targetSkill.name);

      if (deleteError) return unknownError({ endpoint: 'endorseSkill', error: deleteError });
    }

    const { count, error: countError } = await supabase
      .from('profile_skill_endorsements')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('skill_name', targetSkill.name);

    if (countError) return unknownError({ endpoint: 'endorseSkill', error: countError });

    const endorsementsCount = count ?? 0;

    return successResponse({
      skillName: targetSkill.name,
      action,
      endorsementsCount,
      endorsedByMe: action === 'endorse',
    });
  } catch (error) {
    return unknownError({ endpoint: 'endorseSkill', error });
  }
}
