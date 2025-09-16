// app/api/profiles/[id]/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Supabase SSR (compatibile Next 15: cookies async)
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

// Limite bio lato server
function limitBio(input: unknown, maxWords = 100) {
  const s = String(input ?? '').trim();
  const words = s.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

// ✅ Signature corretta per Next 15: `context.params` è una Promise
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;

    const supabase = await getSb();

    // Supporta /api/profiles/me
    let id = idParam;
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
      type: 'club',
      display_name: String(body.display_name ?? '').trim(),
      bio: limitBio(body.bio, 100),
    };

    // Esiste già?
    const { data: existing, error: e1 } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle(); // evita "Cannot coerce the result..."

    if (e1) throw e1;

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
