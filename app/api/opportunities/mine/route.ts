import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = u.user.id;

  // 1) Annunci del proprietario
  const { data: opps, error } = await supabase
    .from('opportunities')
    .select('id,title,city,province,region,country,created_at')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!opps || opps.length === 0) return NextResponse.json({ data: [] });

  // 2) Candidature per quegli annunci
  const ids = opps.map((o) => o.id);
  const { data: apps, error: e2 } = await supabase
    .from('applications')
    .select('id, opportunity_id, status')
    .in('opportunity_id', ids);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  // 3) Aggrego i conteggi
  type C = { total: number; submitted: number; accepted: number; rejected: number };
  const zero: C = { total: 0, submitted: 0, accepted: 0, rejected: 0 };
  const counts = new Map<string, C>();
  ids.forEach((id) => counts.set(id, { ...zero }));
  if (apps) {
    for (const a of apps as any[]) {
      const key = a.opportunity_id as string;
      const c = counts.get(key) ?? { ...zero };
      c.total++;
      const s = (a.status ?? 'submitted').toLowerCase();
      if (s === 'accepted') c.accepted++;
      else if (s === 'rejected') c.rejected++;
      else c.submitted++;
      counts.set(key, c);
    }
  }

  const data = opps.map((o) => ({
    ...o,
    applications_count: counts.get(o.id) ?? { ...zero },
  }));

  return NextResponse.json({ data });
}
