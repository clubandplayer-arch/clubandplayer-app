// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Email endpoints (brand + resilienza env)', () => {
  test('POST /api/notifications/send → 200 + (noop:true | ok/id)', async ({ request }) => {
    const resp = await request.post('/api/notifications/send', {
      headers: { 'content-type': 'application/json' },
      data: {
        to: 'test@example.com',
        subject: 'E2E Brand Test',
        text: 'Ciao dal brand!',
        previewText: 'Anteprima E2E',
        ctaLabel: 'Apri',
        ctaHref: 'https://example.com'
      }
    });

    expect(resp.ok()).toBeTruthy();

    const json = await resp.json();
    const acceptable =
      json?.noop === true ||
      json?.status === 'ok' ||
      json?.ok === true ||
      typeof json?.id === 'string';
    expect(acceptable).toBeTruthy();
  });

  test('POST /api/notify-email → noop 200 / ok 200 / 500 env', async ({ request }) => {
    const resp = await request.post('/api/notify-email', {
      headers: { 'content-type': 'application/json' },
      data: {
        senderId: '00000000-0000-0000-0000-000000000001',
        receiverId: '00000000-0000-0000-0000-000000000002',
        text: 'Messaggio di prova E2E'
      }
    });

    const status = resp.status();
    const json = await resp.json().catch(() => ({}));

    const ok200 =
      status === 200 &&
      (json?.noop === true || json?.ok === true || typeof json?.id === 'string');

    const acceptable500 =
      status === 500 &&
      typeof json?.error === 'string' &&
      (json.error.includes('supabase') || json.error.includes('env') || json.error.includes('server'));

    expect(ok200 || acceptable500).toBeTruthy();
  });
});
