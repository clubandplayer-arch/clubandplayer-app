// lib/emailTemplates.ts
const BRAND = {
  name: 'Club & Player',
  url:
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://clubandplayer-app.vercel.app',
  logo:
    (process.env.NEXT_PUBLIC_BASE_URL || 'https://clubandplayer-app.vercel.app') +
    '/og.jpg', // puoi sostituire con /logo-email.png in /public
};

/** Rileva se la stringa è un documento HTML completo */
export function isFullHtml(doc: string | undefined | null): boolean {
  if (!doc) return false;
  return /<html[\s>]/i.test(doc);
}

/** Escape base per testo piano inserito in HTML */
export function escapeHtml(s: string): string {
  return s
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;');
}

/** Wrapper HTML email brandizzato (documento completo) */
export function wrapEmail({
  title,
  bodyHtml,
  previewText,
}: {
  title: string;
  bodyHtml: string;
  previewText?: string;
}) {
  const pre = previewText ? previewText.replace(/\s+/g, ' ').trim() : '';
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charSet="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${escapeHtml(title)}</title>
    <meta name="x-preheader" content="${escapeHtml(pre)}"/>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <!-- Hidden preheader text -->
    <div style="display:none;opacity:0;visibility:hidden;height:0;width:0;overflow:hidden;color:transparent;">
      ${escapeHtml(pre)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:20px 24px 12px 24px;text-align:left;">
                <a href="${BRAND.url}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
                  <img src="${BRAND.logo}" alt="${escapeHtml(BRAND.name)}" width="42" height="42" style="display:block;border-radius:12px;" />
                  <span style="font-weight:700;font-size:16px;color:#0f172a;">${escapeHtml(BRAND.name)}</span>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 24px 20px 24px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>

          <p style="margin-top:16px;font-size:12px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} ${escapeHtml(BRAND.name)} — Tutti i diritti riservati.
            <br/>
            <a href="${BRAND.url}/email/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Disiscriviti</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** CTA semplice (body) da usare dentro wrapEmail */
export function renderCtaBlock(opts: {
  intro?: string;
  ctaLabel: string;
  ctaHref: string;
  note?: string;
}) {
  const intro = opts.intro
    ? `<p style="margin:0 0 12px 0;color:#111827;line-height:1.5;">${opts.intro}</p>`
    : '';
  const note = opts.note
    ? `<p style="margin:12px 0 0 0;color:#6b7280;line-height:1.5;font-size:12px;">${opts.note}</p>`
    : '';
  return `
    ${intro}
    <p style="margin:0 0 0 0;">
      <a href="${opts.ctaHref}"
         style="display:inline-block;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;color:#111827;">
        ${opts.ctaLabel} →
      </a>
    </p>
    ${note}
  `;
}

export const BRAND_INFO = BRAND;
