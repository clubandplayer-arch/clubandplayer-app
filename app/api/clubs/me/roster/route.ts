import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { buildProfileDisplayName } from '@/lib/displayName';

export const runtime = 'nodejs';

const bodySchema = z.object({
  playerProfileId: z.string().min(1, 'playerProfileId obbligatorio'),
  inRoster: z.boolean(),
});

type ClubProfile = { id: string; sport: string | null };
type RosterPlayer = {
  playerProfileId: string;
  status: string;
  createdAt: string | null;
  player: {
    id: string;
    name: string;
    avatarUrl: string | null;
    sport: string | null;
    role: string | null;
    city: string | null;
    province: string | null;
    region: string | null;
    country: string | null;
  };
};

async function getClubProfileForUser(supabase: any, userId: string): Promise<ClubProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_type, type, status, sport')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) return null;

  const accountType = String((data as any)?.account_type ?? (data as any)?.type ?? '').toLowerCase();
  const status = String((data as any)?.status ?? '').toLowerCase();
  if (accountType !== 'club') return null;
  if (status && status !== 'active') return null;

  return { id: data.id as string, sport: (data as any)?.sport ?? null };
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `clubs:roster:get:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  let clubProfile: ClubProfile | null = null;
  try {
    clubProfile = await getClubProfileForUser(supabase, user.id);
  } catch (error: any) {
    console.error('[clubs/me/roster][GET] errore profilo club', error);
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubProfile) return jsonError('Solo i club possono visualizzare la rosa', 403);

  const { data, error } = await supabase
    .from('club_roster_members')
    .select(
      `player_profile_id,status,created_at,
       player:profiles!club_roster_members_player_profile_id_fkey(id, full_name, display_name, avatar_url, sport, role, city, region, province, country, account_type, status)`
    )
    .eq('club_profile_id', clubProfile.id)
    .order('created_at', { ascending: true });

  if (error) return jsonError(error.message, 400);

  const roster: RosterPlayer[] = (data || [])
    .map((row: any) => {
      const player = row?.player;
      if (!player?.id) return null;

      const accountType = String(player.account_type ?? '').toLowerCase();
      const playerStatus = String(player.status ?? '').toLowerCase();
      if (accountType && accountType !== 'athlete') return null;
      if (playerStatus && playerStatus !== 'active') return null;

      return {
        playerProfileId: row.player_profile_id as string,
        status: row.status as string,
        createdAt: row.created_at ?? null,
        player: {
          id: player.id as string,
          name: buildProfileDisplayName(player.full_name, player.display_name, 'Player'),
          avatarUrl: player.avatar_url ?? null,
          sport: player.sport ?? null,
          role: player.role ?? null,
          city: player.city ?? null,
          province: player.province ?? null,
          region: player.region ?? null,
          country: player.country ?? null,
        },
      } as RosterPlayer;
    })
    .filter(Boolean) as RosterPlayer[];

  return NextResponse.json({ ok: true, sport: clubProfile.sport ?? null, roster });
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `clubs:roster:post:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({}) as any));
  if (!parsed.success) {
    console.warn('[clubs/me/roster][POST] payload non valido', parsed.error.flatten());
    return jsonError('Payload non valido', 400, { details: parsed.error.flatten() });
  }

  const { playerProfileId, inRoster } = parsed.data;

  let clubProfile: ClubProfile | null = null;
  try {
    clubProfile = await getClubProfileForUser(supabase, user.id);
  } catch (error: any) {
    console.error('[clubs/me/roster][POST] errore profilo club', error);
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubProfile) return jsonError('Solo i club possono modificare la rosa', 403);

  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .eq('id', playerProfileId)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 400);
  if (!targetProfile?.id || String(targetProfile.status ?? '').toLowerCase() !== 'active') {
    return jsonError('Player non trovato o non attivo', 404);
  }
  if (String((targetProfile as any).account_type ?? '').toLowerCase() !== 'athlete') {
    return jsonError('Il profilo selezionato non è un player', 400);
  }

  if (inRoster) {
    const { data: existingRoster, error: existingError } = await supabase
      .from('club_roster_members')
      .select('club_profile_id')
      .eq('player_profile_id', playerProfileId)
      .maybeSingle();

    if (existingError) return jsonError(existingError.message, 400);
    if (existingRoster?.club_profile_id && existingRoster.club_profile_id !== clubProfile.id) {
      return jsonError('Questo player è già nella rosa di un altro club. Rimuovilo prima di aggiungerlo.', 409, {
        code: 'PLAYER_ALREADY_IN_ROSTER',
      });
    }

    const { data: followRow, error: followError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_profile_id', clubProfile.id)
      .eq('target_profile_id', playerProfileId)
      .maybeSingle();

    if (followError) return jsonError(followError.message, 400);
    if (!followRow?.id) return jsonError('Devi seguire il player prima', 400);

    const { error: upsertError } = await supabase
      .from('club_roster_members')
      .upsert(
        {
          club_profile_id: clubProfile.id,
          player_profile_id: playerProfileId,
          status: 'active',
          created_by: user.id,
        },
        { onConflict: 'club_profile_id,player_profile_id' },
      );

    if (upsertError) return jsonError(upsertError.message, 400);

    return NextResponse.json({ ok: true, inRoster: true, playerProfileId });
  }

  const { error: deleteError } = await supabase
    .from('club_roster_members')
    .delete()
    .eq('club_profile_id', clubProfile.id)
    .eq('player_profile_id', playerProfileId);

  if (deleteError) return jsonError(deleteError.message, 400);

  return NextResponse.json({ ok: true, inRoster: false, playerProfileId });
});
