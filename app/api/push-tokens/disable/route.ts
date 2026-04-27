import { withAuth } from '@/lib/api/auth';
import { invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

type DisablePushTokenBody = {
  token?: unknown;
  device_id?: unknown;
  disable_all?: unknown;
};

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token) return null;
  return token;
}

function normalizeDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export const POST = withAuth(async (req, { supabase, user }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as DisablePushTokenBody;
    const token = normalizeToken(body.token);
    const deviceId = normalizeDeviceId(body.device_id);
    const disableAll = body.disable_all === true;

    if (!disableAll && !token && !deviceId) {
      return invalidPayload('specifica token, device_id oppure disable_all=true');
    }

    let updateQuery = supabase
      .from('push_tokens')
      .update({ enabled: false, last_seen_at: new Date().toISOString() }, { count: 'exact' })
      .eq('user_id', user.id);

    if (!disableAll && token) {
      updateQuery = updateQuery.eq('token', token);
    }

    if (!disableAll && deviceId) {
      updateQuery = updateQuery.eq('device_id', deviceId);
    }

    const { error, count } = await updateQuery;

    if (error) {
      return unknownError({
        endpoint: 'push-tokens/disable',
        error,
        message: error.message || 'Errore disabilitazione push token',
      });
    }

    return successResponse({ updated: count || 0 });
  } catch (error) {
    return unknownError({ endpoint: 'push-tokens/disable', error });
  }
});
