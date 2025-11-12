import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

function normalizeRole(t?: string | null): Role {
  const s = (t ?? '').toString().toLowerCase();
  if (s.includes('club')) return 'club';
  if (s.includes('athlet') || s.includes('atlet')) return 'athlete';
  return 'guest';
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    // utente
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      // nessuna sessione → ospite
      return NextResponse.json({ role: 'guest', user: null } as const, { status: 200 });
    }
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ role: 'guest', user: null } as const, { status: 200 });
    }

    // profilo (per derivare il ruolo)
    const { data: prof } = await supabase
      .from('profiles')
      .select('account_type,profile_type')
      .eq('id', user.id)
      .maybeSingle();

    const role = normalizeRole(prof?.account_type ?? prof?.profile_type);

    return NextResponse.json({
      role,
      user: { id: user.id, email: user.email ?? null },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
