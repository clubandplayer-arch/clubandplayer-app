// app/api/notify-email/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { wrapEmail, escapeHtml, renderCtaBlock, BRAND_INFO } from '@/lib/emailTemplates';

export const runtime = 'nodejs';

type Body = { senderId: string; receiverId: string; text: string };

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/notify-email' });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST,GET,OPTIONS' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { senderId, receiverId, text } = (await req.json()) as Body;
    if (!senderId || !receiverId || !text) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: receiverUser, error: rErr } = await supabase.auth.admin.getUserById(receiverId);
    if (rErr || !receiverUser?.user?.email) {
      return NextResponse.json({ ok: false, error: 'receiver_not_found' }, { status: 404 });
    }

    const { data: senderProf } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .limit(1);

    const senderName =
      senderProf && senderProf[0] ? (senderProf[0] as { full_name: string | null }).full_name : null;

    const subject = 'Nuovo messaggio su Club&Player';
    const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;

    const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://clubandplayer-app.vercel.app';
    const chatUrl = `${BASE}/messages/${encodeURIComponent(senderId)}`;

    // Guard no-op se manca Resend
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
      console.warn('Resend ENV mancanti: no-op');
      return NextResponse.json({ ok: true, noop: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const inner = `
      <p style="margin:0 0 12px 0;color:#111827;line-height:1.5;">
        Ciao, hai ricevuto un nuovo messaggio${senderName ? ` da <b>${escapeHtml(senderName)}</b>` : ''}.
      </p>
      <blockquote style="margin:12px 0;padding:10px;border-left:3px solid #e5e7eb;background:#f9fafb">
        ${escapeHtml(text)}
      </blockquote>
      ${renderCtaBlock({
        intro: '',
        ctaLabel: 'Apri la chat',
        ctaHref: chatUrl,
        note: 'Non rispondere a questa email.',
      })}
    `;

    const html = wrapEmail({
      title: subject,
      previewText: preview,
      bodyHtml: inner,
    });

    const res = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: receiverUser.user.email!,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${BRAND_INFO.url}/email/unsubscribe>`,
      },
    });

    if (res.error) {
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: res.data?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
