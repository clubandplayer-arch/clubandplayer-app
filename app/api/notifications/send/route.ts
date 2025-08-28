import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

type SendBody = {
  to?: string
  user_id?: string
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendBody
    if (!body?.subject) {
      return NextResponse.json({ error: 'Missing subject' }, { status: 400 })
    }

    // Se non arriva "to" ma arriva "user_id", risaliamo all'email con Supabase Admin
    let to = body.to
    if (!to && body.user_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json(
          { error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
          { status: 500 }
        )
      }

      const admin = createClient(supabaseUrl, serviceKey)
      const { data, error } = await admin.auth.admin.getUserById(body.user_id)
      if (error || !data?.user?.email) {
        return NextResponse.json({ error: 'User email not found' }, { status: 404 })
      }
      to = data.user.email
    }

    if (!to) {
      return NextResponse.json({ error: 'Missing recipient (to or user_id)' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const from = body.from ?? 'Club&Player <notifications@your-domain.com>' // <-- sostituisci dominio verificato in Resend

    const sendRes = await resend.emails.send({
      from,
      to,
      subject: body.subject,
      html: body.html ?? `<p>${body.text ?? 'Hai una nuova notifica.'}</p>`,
      text: body.text
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
