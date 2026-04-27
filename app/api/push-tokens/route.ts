import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { dbError, invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

type PushTokenPayload = {
  token?: unknown;
  platform?: unknown;
  deviceId?: unknown;
};

type PostPayloadResult =
  | { ok: false; response: Response }
  | { ok: true; token: string; platform: 'ios' | 'android'; deviceId: string | null };

type DeletePayloadResult =
  | { ok: false; response: Response }
  | { ok: true; token: string };

function parsePostPayload(payload: PushTokenPayload): PostPayloadResult {
  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const platform = typeof payload.platform === 'string' ? payload.platform.trim() : '';
  const deviceIdRaw = typeof payload.deviceId === 'string' ? payload.deviceId.trim() : '';

  if (!token) {
    return { ok: false, response: invalidPayload('token obbligatorio') };
  }

  if (platform !== 'ios' && platform !== 'android') {
    return { ok: false, response: invalidPayload('platform deve essere ios o android') };
  }

  return {
    ok: true,
    token,
    platform,
    deviceId: deviceIdRaw || null,
  };
}

function parseDeletePayload(payload: { token?: unknown }): DeletePayloadResult {
  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  if (!token) {
    return { ok: false, response: invalidPayload('token obbligatorio') };
  }
  return { ok: true, token };
}

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const parsed = parsePostPayload(await req.json().catch(() => ({})));
  if (!parsed.ok) return parsed.response;

  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from('push_tokens').upsert(
      {
        token: parsed.token,
        user_id: user.id,
        platform: parsed.platform,
        device_id: parsed.deviceId,
        enabled: true,
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: 'token' }
    );

    if (error) {
      console.error('[api/push-tokens][POST] db error', error);
      return dbError('Impossibile salvare il push token', error.message);
    }

    return successResponse({ saved: true });
  } catch (error) {
    return unknownError({ endpoint: '/api/push-tokens', error, message: 'Errore inatteso POST /api/push-tokens' });
  }
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  const parsed = parseDeletePayload(await req.json().catch(() => ({})));
  if (!parsed.ok) return parsed.response;

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('push_tokens')
      .update({ enabled: false, updated_at: now, last_seen_at: now })
      .eq('user_id', user.id)
      .eq('token', parsed.token);

    if (error) {
      console.error('[api/push-tokens][DELETE] db error', error);
      return dbError('Impossibile disattivare il push token', error.message);
    }

    return successResponse({ disabled: true });
  } catch (error) {
    return unknownError({ endpoint: '/api/push-tokens', error, message: 'Errore inatteso DELETE /api/push-tokens' });
  }
});
