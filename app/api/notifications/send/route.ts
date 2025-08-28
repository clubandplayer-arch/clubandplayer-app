import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge' // va bene edge: usiamo solo fetch

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      userId,
      type,
      message,
      sendEmail = false,
      email,
      emailSubject = 'Nuova notifica',
    }: {
      userId: string
      type: string
      message: string
      sendEmail?: boolean
      email?: string
      emailSubject?: string
    } = body

    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Inserisce la notifica (passerà le RLS solo se la richiesta è autenticata come l’utente)
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, type, message, read: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Email opzionale via Resend REST API (niente SDK)
    if (sendEmail && email && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'no-reply@clubandplayer.app',
            to: [email],
            subject: emailSubject,
            text: message,
          }),
        })
        // Ignoriamo errori dell’email nell’MVP: non blocchiamo la risposta
      } catch {
        // no-op
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
