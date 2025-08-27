import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge' // più veloce

type Body = { senderId: string; receiverId: string; text: string }

export async function POST(req: Request) {
  try {
    const { senderId, receiverId, text } = (await req.json()) as Body
    if (!senderId || !receiverId || !text) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const url = process.env.SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    // prendi email destinatario
    const { data: receiverUser, error: rErr } = await supabase.auth.admin.getUserById(receiverId)
    if (rErr || !receiverUser?.user?.email) {
      return NextResponse.json({ ok: false, error: 'receiver_not_found' }, { status: 404 })
    }

    // prendi nome mittente (facoltativo)
    const { data: senderProf } = await supabase.from('profiles').select('full_name').eq('id', senderId).limit(1)
    const senderName = senderProf && senderProf[0] ? (senderProf[0] as { full_name: string | null }).full_name : null

    // invia email
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const subject = `Nuovo messaggio su Club&Player`
    const to = receiverUser.user.email
    const preview = text.length > 120 ? text.slice(0, 120) + '…' : text
    const chatUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/messages/${senderId}`

    await resend.emails.send({
      from: 'Club&Player <no-reply@mail.clubandplayer.com>',
      to,
      subject,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial;">
          <p>Ciao, hai ricevuto un nuovo messaggio${senderName ? ` da <b>${senderName}</b>` : ''}.</p>
          <blockquote style="margin:12px 0;padding:10px;border-left:3px solid #e5e7eb;background:#f9fafb">${preview}</blockquote>
          <p><a href="${chatUrl}" style="display:inline-block;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;">Apri la chat →</a></p>
          <p style="color:#6b7280;font-size:12px">Non rispondere a questa email.</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
