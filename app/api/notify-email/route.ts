import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isClubsAdminUser } from '@/lib/api/admin'
import { getResendConfig } from '@/lib/server/resendConfig'

export const runtime = 'nodejs'

type Body = { senderId: string; receiverId: string; text: string }

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/notify-email' })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST,GET,OPTIONS' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await getSupabaseServerClient()
    const { data: auth } = await supabaseServer.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })
    }

    const { senderId, receiverId, text } = (await req.json()) as Body
    if (!senderId || !receiverId || !text) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const isAdmin = await isClubsAdminUser(supabaseServer as any, user)
    if (!isAdmin && senderId !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 })
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: receiverUser, error: rErr } = await supabase.auth.admin.getUserById(receiverId)
    if (rErr || !receiverUser?.user?.email) {
      return NextResponse.json({ ok: false, error: 'receiver_not_found' }, { status: 404 })
    }

    const { data: senderProf } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .limit(1)

    const senderName =
      senderProf && senderProf[0] ? (senderProf[0] as { full_name: string | null }).full_name : null

    const subject = 'Nuovo messaggio su Club&Player'
    const preview = text.length > 120 ? text.slice(0, 120) + '…' : text
    const chatUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/messages/${senderId}`

    const resendConfig = getResendConfig()
    if (!resendConfig.ok) {
      return NextResponse.json(
        { ok: false, error: 'resend_env_missing', missing: resendConfig.missing },
        { status: 500 }
      )
    }
    if (resendConfig.noop) {
      console.warn('NOOP_EMAILS attivo: risposta no-op')
      return NextResponse.json({ ok: true, noop: true })
    }

    const resend = new Resend(resendConfig.apiKey)
    const sendRes = await resend.emails.send({
      from: resendConfig.from, // es. "Club&Player <no-reply@mail.clubandplayer.com>"
      to: receiverUser.user.email,
      subject,
      html: `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;">
            <p>Ciao, hai ricevuto un nuovo messaggio${senderName ? ` da <b>${senderName}</b>` : ''}.</p>
            <blockquote style="margin:12px 0;padding:10px;border-left:3px solid #e5e7eb;background:#f9fafb">${preview}</blockquote>
            <p><a href="${chatUrl}" style="display:inline-block;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;">Apri la chat →</a></p>
            <p style="color:#6b7280;font-size:12px">Non rispondere a questa email.</p>
          </div>
        `,
      replyTo: resendConfig.replyTo,
    })

    if (sendRes.error) {
      return NextResponse.json({ ok: false, error: sendRes.error.message }, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: sendRes.data?.id ?? null })
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
