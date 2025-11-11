import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, owner_id, title, description, sport, required_category, city, province, region, country, club_name, created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ownerId = (data as any).owner_id ?? (data as any).created_by ?? null;
  return NextResponse.json({ data: { ...data, owner_id: ownerId, created_by: ownerId } });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allowed = [
    'title',
    'description',
    'sport',
    'required_category',
    'city',
    'province',
    'region',
    'country',
  ] as const;
  const update: Record<string, any> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  // Verifica proprietario
  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ownerId = (opp as any).owner_id ?? (opp as any).created_by;
  if (ownerId !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: updated, error: updateErr } = await supabase
    .from('opportunities')
    .update(update)
    .eq('id', id)
    .select('id, owner_id')
    .maybeSingle();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  const normalizedOwner = (updated as any)?.owner_id ?? ownerId;
  return NextResponse.json({ ok: true, data: { ...(updated ?? {}), owner_id: normalizedOwner, created_by: normalizedOwner } });
}
