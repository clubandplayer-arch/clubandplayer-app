import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// Client Supabase server-side (compat con cookies() async su Next 15)
async function getSupabase() {
  const cookieStore = await cookies(); // 👈 ATTENDI cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // usa la firma a 3 argomenti per massima compatibilità
            cookieStore.set(name, value, options);
          } catch {
            /* no-op */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            /* no-op */
          }
        },
      },
    }
  );
}

type Body = {
  id?: string;
  action?: 'apply' | 'unapply' | string;
  meta?: {
    oppTitle?: string;
    clubId?: string;
    clubName?: string;
  };
};

export async function GET() {
  const supabase = await getSupabase(); // 👈 attendi il client
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // guest → nessuna candidatura
    return NextResponse.json({ ids: [] });
  }

  const { data, error } = await supabase
    .from('applications')
    .select('opportunity_id')
    .eq('applicant_id', user.id);

  if (error) {
    return NextResponse.json({ ids: [] });
  }

  const ids = (data ?? []).map((r: any) => String(r.opportunity_id));
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase(); // 👈 attendi il client
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body: Body = await req.json().catch(() => ({} as Body));
    const id = String(body?.id ?? '').trim();
    const action = String(body?.action ?? '').trim(); // 'apply' | 'unapply' | ''
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    // C'è già candidatura per (id, user.id)?
    const { data: existing, error: selErr } = await supabase
      .from('applications')
      .select('id')
      .eq('opportunity_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle();

    if (action === 'unapply' || (!action && existing)) {
      // rimuovi candidatura
      const { error: delErr } = await supabase
        .from('applications')
        .delete()
        .eq('opportunity_id', id)
        .eq('applicant_id', user.id);

      if (delErr) {
        return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
      }
    } else if (action === 'apply' || (!action && !existing)) {
      // crea candidatura (RLS imposterà applicant_id = auth.uid())
      const { error: insErr } = await supabase
        .from('applications')
        .insert({ opportunity_id: id });

      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
    } else if (selErr && selErr.message) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 });
    }

    // Ricalcola gli ids dell'utente
    const { data: rows, error: idsErr } = await supabase
      .from('applications')
      .select('opportunity_id')
      .eq('applicant_id', user.id);

    if (idsErr) {
      return NextResponse.json({ ok: false, error: idsErr.message }, { status: 400 });
    }

    const ids = (rows ?? []).map((r: any) => String(r.opportunity_id));
    const applied = ids.includes(id);

    return NextResponse.json({ ok: true, applied, ids });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
