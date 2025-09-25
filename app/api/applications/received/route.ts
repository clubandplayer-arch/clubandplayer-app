import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try { store.set(name, value, options); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { store.set(name, '', { ...options, maxAge: 0 }); } catch {}
        },
      },
    }
  );
}

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  // Grazie alle RLS create per E2, qui il club vede SOLO le applications
  // relative alle opportunità di cui è owner (opportunities.created_by = auth.uid()).
  // Proviamo a portare anche un minimo di dati dal join su opportunities.
  const { data, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, applicant_id, created_at, opportunities!inner(id, title)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 400 });

  // Normalizza la shape per non rompere UI esistente
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    opportunity_id: row.opportunity_id,
    applicant_id: row.applicant_id,
    created_at: row.created_at,
    opportunity: row.opportunities ? { id: row.opportunities.id, title: row.opportunities.title } : undefined,
  }));

  return NextResponse.json({ items });
}
