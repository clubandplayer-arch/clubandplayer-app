// app/api/opportunities/[id]/apply/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }, { params }) => {
  const opportunityId = params?.id;
  if (!opportunityId) return jsonError('Missing opportunity id', 400);

  // Verifica che l'utente sia un ATLETA
  const { data: me } = await supabase.from('profiles').select('type').eq('user_id', user.id).single();
  if (!me || me.type !== 'athlete') return jsonError('Only athletes can apply', 405);

  const body = await req.json().catch(() => ({}));
  const note = (body.note ?? '').trim() || null;

  const { error } = await supabase
    .from('applications')
    .insert({ opportunity_id: opportunityId, athlete_id: user.id, note, status: 'submitted' });

  if (error) {
    // violazione unique => ha già applicato
    if (String(error.code) === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return jsonError(error.message, 400);
  }
  return NextResponse.json({ ok: true });
});
