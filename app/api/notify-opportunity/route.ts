import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type Body = { opportunityId: string }
type OpportunityRow = {
  id: string
  sport: string
  role: string
  region: string | null
  province: string | null
  city: string
  title: string
  club_name: string
}
type AlertRow = {
  user_id: string
  sport: string
  role: string | null
  region: string | null
  province: string | null
  city: string | null
}

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/notify-opportunity' })
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST,GET,OPTIONS' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { opportunityId } = (await req.json()) as Body
    if (!opportunityId) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 })
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: opps, error: oErr } = await supabase
      .from('opportunities')
      .select('id, sport, role, region, province, city, title, club_name')
      .eq('id', opportunityId)
      .limit(1)

    if (oErr || !opps || opps.length === 0) {
      return NextResponse.json({ ok: false, error: 'opportunity_not_found' }, { status: 404 })
    }
    const opp = opps[0] as OpportunityRow

    const { data: alerts, error: aErr } = await supabase
      .from('alerts')
      .select('user_id, sport, role, region, province, city')
      .eq('sport', opp.sport)

    if (aErr) {
      return NextResponse.json({ ok: false, error: 'alerts_query_error' }, { status: 500 })
    }

    const list = (alerts ?? []) as AlertRow[]

    const matches: AlertRow[] = list.filter((a) => {
      const roleOk = !a.role || a.role === opp.role
      const cityOk = a.city ? a.city === opp.city : true
      const provOk = a.province ? a.province === opp.province : true
      const regOk = a.region ? a.region === opp.region : true
      if (a.city) return roleOk && cityOk
      if (a.province) return roleOk && provOk
      if (a.region) return roleOk && regOk
      return roleOk
    })

    if (matches.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    const userIds = Array.from(new Set(matches.map((m) => m.user_id)))
    const emails: { id: string; email: string }[] = []
    for (const uid of userIds) {
      const { data: ures } = await supabase.auth.admin.getUserById(uid)
      const email = ures?.user?.email
      if (email) emails.push({ id: uid, email })
    }
    if (emails.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    // Guard no-op se manca Resend
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
      console.warn('Resend ENV mancanti: no-op')
      return NextResponse.json({ ok: true, noop: true, notified: 0 })
    }

    const subject = `Nuova opportunità: ${opp.title}`
    const urlApp = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const oppUrl = `${urlApp}/opportunities`
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial;">
        <p><b>${opp.club_name}</b> ha pubblicato un nuovo annuncio.</p>
        <p><b>${opp.title}</b><br/>Sport: ${opp.sport} · Ruolo: ${opp.role}<br/>Località: ${opp.city}${opp.province ? ` (${opp.province})` : ''}${opp.region ? `, ${opp.region}` : ''}</p>
        <p><a href="${oppUrl}" style="display:inline-block;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;">Apri le opportunità →</a></p>
        <p style="color:#6b7280;font-size:12px">Non rispondere a questa email.</p>
      </div>
    `

    for (const rec of emails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM, // es. "Club&Player <no-reply@mail.clubandplayer.com>"
          to: rec.email,
          subject,
          html,
        }),
      })
    }

    return NextResponse.json({ ok: true, notified: emails.length })
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
