import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, owner_id, title, description, sport, required_category, city, province, region, country, created_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('opportunities')
    .update(update)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}
