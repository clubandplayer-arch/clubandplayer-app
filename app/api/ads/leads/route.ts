import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MS = 20_000
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const rateLimitByIp = new Map<string, number>()

const noStoreHeaders = { 'Cache-Control': 'no-store' }

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const LeadSchema = z
  .object({
    name: z.string().min(1),
    company: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(1),
    phone: z.string().optional(),
    location: z.string().optional(),
    budget: z.string().optional(),
    company_website: z.string().optional(),
    fullName: z.string().optional(),
  })
  .passthrough()

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

const getProfileId = async () => {
  try {
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user?.id) return null

    const { data: profileByUserId } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileByUserId?.id) return profileByUserId.id as string

    const { data: profileById } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    return profileById?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const normalizedBody = {
    ...body,
    name: normalizeText(body?.name || body?.fullName),
    company: normalizeText(body?.company),
    email: normalizeText(body?.email),
    message: normalizeText(body?.message),
    phone: normalizeText(body?.phone) || undefined,
    location: normalizeText(body?.location) || undefined,
    budget: normalizeText(body?.budget) || undefined,
    company_website: normalizeText(body?.company_website) || undefined,
  }

  const parsed = LeadSchema.safeParse(normalizedBody)
  if (!parsed.success) {
    const details = process.env.NODE_ENV !== 'production' ? parsed.error.flatten() : undefined
    return NextResponse.json(
      { ok: false, error: 'Dati non validi. Controlla i campi obbligatori.', details },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const { name, company, email, phone, location, message, budget, company_website } = parsed.data
  const honeypot = normalizeText(company_website)

  if (honeypot) {
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders })
  }

  if (!name || !company || !message || !emailRegex.test(email)) {
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

  const adminClient = getSupabaseAdminClientOrNull()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'Database non configurato.' },
      { status: 500, headers: noStoreHeaders }
    )
  }

  const profileId = await getProfileId()
  const { data: leadRow, error: leadError } = await adminClient
    .from('ad_leads')
      .insert({
      name,
      company,
      email,
      phone: phone || null,
      location: location || null,
      budget: budget || null,
      message,
      source: 'sponsor',
      profile_id: profileId,
    })
    .select('id,status')
    .single()

  if (leadError || !leadRow) {
    return NextResponse.json(
      { ok: false, error: 'Errore durante il salvataggio del lead.' },
      { status: 500, headers: noStoreHeaders }
    )
  }

  const resendKey = process.env.RESEND_API_KEY
  const toAddress =
    process.env.ADS_LEADS_TO ||
    process.env.LEADS_TO ||
    process.env.LEAD_TO ||
    process.env.ADS_LEAD_TO
  const fromAddress =
    process.env.ADS_LEADS_FROM ||
    process.env.LEADS_FROM ||
    process.env.LEAD_FROM ||
    process.env.ADS_LEAD_FROM

  const hasValidTo = !!toAddress && toAddress.includes('@')
  const hasValidFrom = !!fromAddress && fromAddress.includes('@')
  if (!resendKey || !hasValidTo || !hasValidFrom) {
    console.error('[ads/leads] missing email env', {
      hasResendKey: !!resendKey,
      hasTo: !!toAddress,
      hasFrom: !!fromAddress,
    })
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
    `Lead ID: ${leadRow.id}`,
    `Status: ${leadRow.status ?? 'new'}`,
    `Nome e Cognome: ${name}`,
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

  const resend = new Resend(resendKey)
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

  return NextResponse.json(
    { ok: true, id: sendRes.data?.id ?? null, lead_id: leadRow.id, status: leadRow.status ?? 'new' },
    { headers: noStoreHeaders }
  )
}
