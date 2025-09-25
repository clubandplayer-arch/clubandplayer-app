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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  const id = String(params?.id ?? '').trim();
  if (!id) return NextResponse.json({ items: [] }, { status: 400 });

  // RLS: il club vedrà risultati solo se owner dell'opportunità id
  const { data, error } = await supabase
    .from('applications')
    .select('id, applicant_id, created_at')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 400 });

  return NextResponse.json({ items: data ?? [] });
}
