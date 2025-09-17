// app/api/opportunities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Helper Supabase compatibile con Next 15 (cookies() async)
async function getSupabase() {
  const store = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        store.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        store.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
    cookieOptions: { sameSite: 'lax' },
  })
}

async function revalidateAll() {
  try {
    revalidatePath('/opportunities')
    revalidatePath('/feed')
    revalidatePath('/my/opportunities')
  } catch {
    // no-op durante build
  }
}

// PATCH /api/opportunities/[id]
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const supabase = await getSupabase()
    const { data: u, error: ue } = await supabase.auth.getUser()
    if (ue || !u?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const userId = u.user.id

    const body = await req.json()

    // Solo i campi ammessi
    const allowed = [
      'title',
      'description',
      'sport',
      'role',
      'age_min',
      'age_max',
      'country',
      'region',
      'province',
      'city',
      'club_name',
      'status',
      'visibility',
    ] as const
    const update: Record<string, any> = {}
    for (const k of allowed) if (k in body) update[k] = body[k]

    const { data, error } = await supabase
      .from('opportunities')
      .update(update)
      .eq('id', id)
      .eq('created_by', userId) // sicurezza: solo il proprietario può modificare
      .select('*')
      .single()

    if (error) {
      // se non corrisponde il proprietario, Supabase non restituisce riga
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await revalidateAll()
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'update_failed' }, { status: 500 })
  }
}

// DELETE /api/opportunities/[id]
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const supabase = await getSupabase()
    const { data: u, error: ue } = await supabase.auth.getUser()
    if (ue || !u?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const userId = u.user.id

    const { data, error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)
      .eq('created_by', userId) // sicurezza: solo il proprietario può eliminare
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await revalidateAll()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'delete_failed' }, { status: 500 })
  }
}
