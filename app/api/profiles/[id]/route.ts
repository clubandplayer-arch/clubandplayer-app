// app/api/profiles/[id]/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// --- Supabase SSR client (compatibile Next 15) ---
async function getSb() {
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const c = await cookies();
          return c.get(name)?.value;
        },
        async set(name: string, value: string, options: any) {
          const c = await cookies();
          c.set({ name, value, ...options });
        },
        async remove(name: string, options: any) {
          const c = await cookies();
          c.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
  return sb;
}

// limite bio lato server
function limitBio(bio: unknown, maxWords = 100) {
  const s = String(bio ?? '').trim();
  const words = s.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let supabase = await getSb();

    // Supporta PATCH /api/profiles/me: risolve l'UUID dell'utente loggato
    let { id } = params;
    if (id === 'me') {
      const { data: auth, error: eUser } = await supabase.auth.getUser();
      if (eUser) throw eUser;
      if (!auth?.user?.id) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      id = auth.user.id;
    }

    const body = await req.json();
    const payload = {
      type: 'club', // forziamo club per la pagina profilo club
      display_name: String(body.display_name ?? '').trim(),
      bio: limitBio(body.bio, 100),
    };

    // 1) Controlla se esiste già una riga per quell'id
    const { data: existing, error: e1 } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle(); // evita l’errore "Cannot coerce..."

    if (e1) throw e1;

    // 2) Update oppure Insert, SEMPRE filtrando per id
    let data, error;
    if (existing) {
      ({ data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle());
    } else {
      ({ data, error } = await supabase
        .from('profiles')
        .insert({ id, ...payload })
        .select('*')
        .maybeSingle());
    }

    if (error) throw error;

    try {
      revalidatePath('/profile');
      revalidatePath('/club/profile');
    } catch {
      /* no-op in build */
    }

    return NextResponse.json({ ok: true, profile: data ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'update_failed' },
      { status: 400 }
    );
  }
}
