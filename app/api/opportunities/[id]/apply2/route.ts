// app/api/opportunities/[id]/apply2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ Next 15: params è Promise

  const supabase = await getSupabaseServerClient();

  // 1) Utente loggato?
  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 2) Solo atleti possono candidarsi
  const { data: prof, error: perr } = await supabase
    .from('profiles')
    .select('id, type')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (perr) return NextResponse.json({ error: perr.message }, { status: 400 });
  const ptype = (prof?.type ?? '').toLowerCase();
  if (ptype !== 'athlete') {
    return NextResponse.json({ error: 'only_athlete_can_apply' }, { status: 403 });
  }

  // 3) Opportunità esiste?
  const { data: opp, error: oerr } = await supabase
    .from('opportunities')
    .select('id, owner_id, required_category')
    .eq('id', id)
    .maybeSingle();

  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 });

  // 4) Non candidarti al tuo stesso annuncio
  if (opp.owner_id === user.id) {
    return NextResponse.json({ error: 'cannot_apply_to_own_opportunity' }, { status: 400 });
  }

  // 5) Già candidato?
  const { data: existing, error: exerr } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', id)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (exerr) return NextResponse.json({ error: exerr.message }, { status: 400 });
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, already: true });
  }

  // 6) Crea candidatura
  const { data: created, error: cerr } = await supabase
    .from('applications')
    .insert({
      opportunity_id: id,
      athlete_id: user.id,
      status: 'submitted',
      note: '',
    })
    .select('id')
    .maybeSingle();

  if (cerr) return NextResponse.json({ error: cerr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created?.id });
}
