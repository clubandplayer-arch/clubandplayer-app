import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MS = 20_000
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const rateLimitByIp = new Map<string, number>()

const noStoreHeaders = { 'Cache-Control': 'no-store' }

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const fullName = normalizeText(body?.fullName)
  const company = normalizeText(body?.company)
  const email = normalizeText(body?.email)
  const phone = normalizeText(body?.phone)
  const location = normalizeText(body?.location)
  const message = normalizeText(body?.message)
  const budget = normalizeText(body?.budget)
  const honeypot = normalizeText(body?.company_website)

  if (honeypot) {
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders })
  }

  if (!fullName || !company || !location || !message || !emailRegex.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'Dati non validi. Controlla i campi obbligatori.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const ip = getClientIp(req)
  if (ip && ip !== 'unknown') {
    const lastHit = rateLimitByIp.get(ip) ?? 0
    if (Date.now() - lastHit < RATE_LIMIT_MS) {
      return NextResponse.json(
        { ok: false, error: 'Troppi invii ravvicinati. Riprova più tardi.' },
        { status: 429, headers: noStoreHeaders }
      )
    }
    rateLimitByIp.set(ip, Date.now())
  }

  const apiKey = process.env.RESEND_API_KEY
  const toAddress = process.env.ADS_LEADS_TO
  const fromAddress = process.env.ADS_LEADS_FROM
  if (!apiKey || !toAddress || !fromAddress) {
    return NextResponse.json(
      { ok: false, error: 'Configurazione email mancante.' },
      { status: 500, headers: noStoreHeaders }
    )
  }

  if (['1', 'true', 'yes', 'on'].includes(String(process.env.NOOP_EMAILS ?? '').toLowerCase())) {
    return NextResponse.json({ ok: true, noop: true }, { headers: noStoreHeaders })
  }

  const subject = `[ADS Lead] ${company} — ${location}`
  const timestamp = new Date().toISOString()
  const userAgent = req.headers.get('user-agent') ?? 'unknown'

  const text = [
    `Nome e Cognome: ${fullName}`,
    `Azienda: ${company}`,
    `Email: ${email}`,
    `Telefono: ${phone || '-'}`,
    `Città/Provincia: ${location}`,
    `Budget indicativo: ${budget || '-'}`,
    `Messaggio: ${message}`,
    ``,
    `Timestamp: ${timestamp}`,
    `IP: ${ip}`,
    `User-Agent: ${userAgent}`,
  ].join('\n')

  const resend = new Resend(apiKey)
  const sendRes = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    subject,
    text,
    replyTo: email,
  })

  if (sendRes.error) {
    return NextResponse.json(
      { ok: false, error: sendRes.error.message },
      { status: 502, headers: noStoreHeaders }
    )
  }

  return NextResponse.json({ ok: true, id: sendRes.data?.id ?? null }, { headers: noStoreHeaders })
}
