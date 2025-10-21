// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ---- GET: dettaglio opportunità ----
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, owner_id, title, description, sport, required_category, city, province, region, country, age_min, age_max, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data });
}

// Helper: costruisce l’oggetto update consentito + alias campi
function buildUpdate(body: any) {
  const update: Record<string, any> = {};

  if (typeof body.title === 'string') update.title = body.title;
  if (typeof body.description === 'string') update.description = body.description;
  if (typeof body.sport === 'string') update.sport = body.sport;

  // alias: role -> required_category
  if (typeof body.required_category === 'string') {
    update.required_category = body.required_category;
  } else if (typeof body.role === 'string') {
    update.required_category = body.role;
  }

  // location (consenti null per svuotare)
  for (const k of ['city', 'province', 'region', 'country'] as const) {
    if (k in body) update[k] = body[k] ?? null;
  }

  // età: consenti age_min/age_max oppure ageMin/ageMax
  const ageMin = body.age_min ?? body.ageMin;
  const ageMax = body.age_max ?? body.ageMax;
  if (typeof ageMin === 'number') update.age_min = ageMin;
  if (typeof ageMax === 'number') update.age_max = ageMax;

  return update;
}

// ---- PATCH: update opportunità (solo owner) ----
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const supabase = await getSupabaseServerClient();
  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update = buildUpdate(body);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  // Verifica proprietà
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('opportunities')
    .update(update)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}

// ---- DELETE: elimina opportunità (solo owner) ----
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const supabase = await getSupabaseServerClient();
  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
