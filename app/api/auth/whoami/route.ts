// app/api/auth/whoami/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  // 1) Tentativo normale: sessione letta dai cookie SSR
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // 2) Fallback: se non c'è cookie, prova con Authorization: Bearer <access_token>
  if (!user) {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) {
      const token = m[1];
      const { data, error } = await supabase.auth.getUser(token);
      if (!error) user = data.user ?? null;
    }
  }

  if (!user) {
    // anonimo/guest
    return NextResponse.json({ user: null, role: 'guest' as const }, { status: 200 });
  }

  // 3) Determina il ruolo dal profilo
  const { data: prof } = await supabase
    .from('profiles')
    .select('type')
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
