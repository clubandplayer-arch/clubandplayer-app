import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Helper: supabase server-side con cookie store Next 15 (cookies() è async).
 */
async function getSupabase() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options?: any) {
        // Next 15 accetta (name, value, options)
        cookieStore.set(name, value, { ...(options ?? {}), path: options?.path ?? '/' })
      },
      remove(name: string, options?: any) {
        // Usa set con maxAge=0 per cancellare in modo cross-compatibile
        cookieStore.set(name, '', {
          ...(options ?? {}),
          path: options?.path ?? '/',
          maxAge: 0,
        })
      },
    },
  })

  return client
}

/**
 * GET  → ritorna la lista degli id club seguiti dall’utente corrente
 * JSON: { ids: string[] }
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await getSupabase()

    // Grazie alle RLS policy vediamo solo i nostri record
    const { data, error } = await supabase
      .from('follows')
      .select('club_id')
      .order('created_at', { ascending: false })

    if (error) throw error

    const ids = (data ?? [])
      .map((r) => (r as { club_id: string | null }).club_id)
      .filter(Boolean)
      .map(String)

    return NextResponse.json({ ids }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { ids: [], error: e?.message ?? 'unknown' },
      { status: 200 }, // lato UI preferiamo non far fallire
    )
  }
}

/**
 * POST → toggle follow/unfollow per un club
 * Body: { id: string }
 * Ritorna sempre la lista aggiornata: { ids: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase()
    const body = await req.json().catch(() => ({}))
    const clubIdRaw = body?.id
    const clubId = typeof clubIdRaw === 'string' ? clubIdRaw.trim() : ''

    if (!clubId) {
      return NextResponse.json(
        { ids: [], error: 'missing id' },
        { status: 400 },
      )
    }

    // Esiste già?
    const { data: existing, error: selErr } = await supabase
      .from('follows')
      .select('id, club_id')
      .eq('club_id', clubId)
      .maybeSingle()

    if (selErr) throw selErr

    if (existing?.id) {
      // UNFOLLOW
      const { error: delErr } = await supabase
        .from('follows')
        .delete()
        .eq('id', existing.id)
      if (delErr) throw delErr
    } else {
      // FOLLOW (follower_id = auth.uid() via default; RLS valida)
      const { error: insErr } = await supabase
        .from('follows')
        .insert({ club_id: clubId })
      if (insErr) throw insErr
    }

    // Ritorniamo elenco aggiornato
    const { data: after, error: afterErr } = await supabase
      .from('follows')
      .select('club_id')
      .order('created_at', { ascending: false })

    if (afterErr) throw afterErr

    const ids = (after ?? [])
      .map((r) => (r as { club_id: string | null }).club_id)
      .filter(Boolean)
      .map(String)

    return NextResponse.json({ ids }, { status: 200 })
  } catch (e: any) {
    // fallback soft
    return NextResponse.json(
      { ids: [], error: e?.message ?? 'unknown' },
      { status: 200 },
    )
  }
}
