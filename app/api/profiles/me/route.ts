// @ts-nocheck
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function supabaseServer() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) => cookieStore.set({ name, value, ...options }),
      remove: (name: string, options: any) => cookieStore.set({ name, value: '', ...options, maxAge: 0 }),
    },
  })
}

function limitWords(s: string, max = 100) {
  if (!s) return s
  const words = s.trim().split(/\s+/)
  if (words.length <= max) return s.trim()
  return words.slice(0, max).join(' ')
}

export async function PATCH(req: NextRequest) {
  const supabase = await supabaseServer()

  const { data: { user }, error: uerr } = await supabase.auth.getUser()
  if (uerr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}

  const payload: any = {}
  if (typeof body.display_name === 'string') payload.display_name = body.display_name.trim().slice(0, 120)
  if (typeof body.bio === 'string') payload.bio = limitWords(body.bio, 100)

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: 'empty_payload' }, { status: 400 })
  }

  // aggiorna il profilo dell'utente loggato
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message ?? String(error) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, profile: data })
}
