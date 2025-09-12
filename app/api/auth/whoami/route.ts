// app/api/auth/whoami/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ user: null, role: 'guest' as const }, { status: 200 });
  }

  // Leggi il profilo per dedurre il ruolo
  const { data: prof } = await supabase
    .from('profiles')
    .select('id,type')
    .eq('user_id', user.id)
    .maybeSingle();

  const raw = (prof?.type ?? '').toString().toLowerCase();
  const role: 'club' | 'athlete' | 'guest' =
    raw.startsWith('club') ? 'club' : raw === 'athlete' ? 'athlete' : 'guest';

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? undefined },
    role,
    profile: { type: raw || null },
  });
}
