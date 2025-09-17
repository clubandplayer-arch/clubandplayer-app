// app/api/opportunities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// --- Supabase helper (compatibile Next 15: cookies() è async)
async function getSupabase() {
  const store = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseKey, {
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

// ------------------------- GET /api/opportunities
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabase()
    const url = new URL(req.url)

    const q = url.searchParams.get('q') ?? ''
    const country = url.searchParams.get('country') ?? ''
    const region = url.searchParams.get('region') ?? ''
    const province = url.searchParams.get('province') ?? ''
    const city = url.searchParams.get('city') ?? ''
    const sport = url.searchParams.get('sport') ?? ''
    const role = url.searchParams.get('role') ?? ''
    const sort = (url.searchParams.get('sort') ?? 'recent').toLowerCase()
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query
    let qb = supabase
      .from('opportunities')
      .select('*', { count: 'exact' })

    // Ricerca full-text semplice su title/description
    if (q) {
      qb = qb.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }

    // Filtri esatti
    if (country) qb = qb.eq('country', country)
    if (region) qb = qb.eq('region', region)
    if (province) qb = qb.eq('province', province)
    if (city) qb = qb.eq('city', city)
    if (sport) qb = qb.eq('sport', sport)
    if (role) qb = qb.eq('role', role)

    // Ordinamento: recent -> created_at desc
    qb = qb.order('created_at', { ascending: sort !== 'recent' })

    // Paginazione
    qb = qb.range(from, to)

    const { data, error, count } = await qb
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: Array.isArray(data) ? data : [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'list_failed' }, { status: 500 })
  }
}

// ------------------------- POST /api/opportunities
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase()

    // Utente corrente (serve per created_by)
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const userId = userRes.user.id

    const body = await req.json()

    // Mappa del payload: ADATTA i nomi se la tua tabella usa colonne diverse
    const payload = {
      title: body.title ?? '',
      description: body.description ?? '',
      sport: body.sport ?? null,
      role: body.role ?? null,
      age_min: body.age_min ?? null,
      age_max: body.age_max ?? null,
      country: body.country ?? null,
      region: body.region ?? null,
      province: body.province ?? null,
      city: body.city ?? null,
      club_name: body.club_name ?? body.clubName ?? null,
      created_by: userId,
      // eventuali altri campi: status, visibility, etc.
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Revalidate le pagine che mostrano la lista
    try {
      revalidatePath('/opportunities')
      revalidatePath('/feed')
      revalidatePath('/my/opportunities')
    } catch {
      // no-op in build
    }

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'create_failed' }, { status: 500 })
  }
}
