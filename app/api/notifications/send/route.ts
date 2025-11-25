import { NextResponse, NextRequest } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isClubsAdminUser } from '@/lib/api/admin'
import { getResendConfig } from '@/lib/server/resendConfig'

export const runtime = 'nodejs'

type SendBody = {
  to?: string
  user_id?: string
  subject: string
  html?: string
  text?: string
  from?: string
}

// Health-check GET
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/notifications/send' })
}

// OPTIONS per evitare 405 su CORS/preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST,GET,OPTIONS' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const isAdmin = await isClubsAdminUser(supabase as any, user)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as SendBody
    if (!body?.subject) {
      return NextResponse.json({ error: 'Missing subject' }, { status: 400 })
    }

    // Se non arriva "to" ma arriva "user_id", risaliamo all'email con Supabase Admin
    let to = body.to
    if (!to && body.user_id) {
      const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json(
          { error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY' },
          { status: 500 }
        )
      }

      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      const { data, error } = await admin.auth.admin.getUserById(body.user_id)
      if (error || !data?.user?.email) {
        return NextResponse.json({ error: 'User email not found' }, { status: 404 })
      }
      to = data.user.email
    }

    if (!to) {
      return NextResponse.json({ error: 'Missing recipient (to or user_id)' }, { status: 400 })
    }

    const resendConfig = getResendConfig()
    if (!resendConfig.ok) {
      return NextResponse.json(
        { error: 'Missing Resend configuration', missing: resendConfig.missing },
        { status: 500 }
      )
    }
    if (resendConfig.noop) {
      console.warn('NOOP_EMAILS attivo: risposta no-op')
      return NextResponse.json({ ok: true, noop: true })
    }

    const resend = new Resend(resendConfig.apiKey)
    const from = body.from ?? resendConfig.from // es. "Club&Player <no-reply@mail.clubandplayer.com>"

    const sendRes = await resend.emails.send({
      from,
      to,
      subject: body.subject,
      html: body.html ?? `<p>${body.text ?? 'Hai una nuova notifica.'}</p>`,
      text: body.text,
      replyTo: resendConfig.replyTo,
    })

    if (sendRes.error) {
      return NextResponse.json({ error: sendRes.error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', id: sendRes.data?.id ?? null })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
