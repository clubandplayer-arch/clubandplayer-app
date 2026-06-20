import { withAuth } from '@/lib/api/auth';
import { invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

type RegisterPushTokenBody = {
  token?: unknown;
  platform?: unknown;
  device_id?: unknown;
  deviceId?: unknown;
};

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token) return null;
  if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) return token;
  return null;
}

function normalizePlatform(value: unknown): 'ios' | 'android' | null {
  if (typeof value !== 'string') return null;
  const platform = value.trim().toLowerCase();
  if (platform === 'ios' || platform === 'android') return platform;
  return null;
}

function normalizeDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

export const POST = withAuth(async (req, { supabase }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as RegisterPushTokenBody;
    const token = normalizeToken(body.token);
    if (!token) return invalidPayload('token push Expo non valido');

    const platform = normalizePlatform(body.platform);
    if (!platform) return invalidPayload('platform non valida (atteso ios|android)');

    const rawDeviceId = body.deviceId ?? body.device_id ?? null;
    const deviceId = normalizeDeviceId(rawDeviceId);
    if (rawDeviceId != null && !deviceId) return invalidPayload('deviceId/device_id non valido');

    console.log('[push-register] using register_push_token rpc');

    const { data, error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: platform,
      p_device_id: deviceId,
    });

    if (error) {
      return unknownError({
        endpoint: 'push-tokens/register',
        error,
        message: error.message || 'Errore registrazione push token',
      });
    }

    return successResponse({ token: data });
  } catch (error) {
    return unknownError({ endpoint: 'push-tokens/register', error });
  }
});
