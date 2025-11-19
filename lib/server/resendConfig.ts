export type ResendConfig =
  | { ok: true; apiKey: string; from: string; replyTo: string }
  | { ok: false; missing: string[] }

export function getResendConfig(): ResendConfig {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const replyTo = process.env.BRAND_REPLY_TO

  const missing = [
    !apiKey && 'RESEND_API_KEY',
    !from && 'RESEND_FROM',
    !replyTo && 'BRAND_REPLY_TO',
  ].filter(Boolean) as string[]

  if (missing.length) return { ok: false, missing }

  return {
    ok: true,
    apiKey: apiKey!,
    from: from!,
    replyTo: replyTo!,
  }
}
