import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase' // se non ce l’hai, rimuovi il generics

export const runtime = 'edge'

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

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Inserisce la notifica per l'utente (passa RLS perché la chiamata deve essere autenticata come l’utente stesso; in caso contrario usa un Service Role in un route server "node")
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, type, message, read: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Email opzionale via Resend
    if (sendEmail && email && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      try {
        await resend.emails.send({
          from: 'no-reply@clubandplayer.app',
          to: email,
          subject: emailSubject,
          text: message,
        })
      } catch {
        // ignora per MVP
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
