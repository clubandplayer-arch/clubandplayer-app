// app/api/auth/whoami/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const jar = await cookies();

  // Se non ci sono cookie di sessione Supabase → rispondiamo direttamente "guest"
  const hasSession =
    Boolean(jar.get('sb-access-token')) || Boolean(jar.get('sb-refresh-token'));

  if (!hasSession) {
    return NextResponse.json({ user: null, role: 'guest' as const }, { status: 200 });
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    // Se non c’è utente valido → guest (silenzia i log di refresh)
    if (authErr || !auth?.user) {
      return NextResponse.json({ user: null, role: 'guest' as const }, { status: 200 });
    }

    const user = auth.user;

    // Deduci il ruolo dal profilo (se presente)
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
  } catch {
    // In qualunque errore → guest
    return NextResponse.json({ user: null, role: 'guest' as const }, { status: 200 });
  }
}
