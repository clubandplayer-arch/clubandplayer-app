import { withAuth } from '@/lib/api/auth';
import { invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

type RegisterPushTokenBody = {
  token?: unknown;
  platform?: unknown;
  device_id?: unknown;
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

export const POST = withAuth(async (req, { supabase, user }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as RegisterPushTokenBody;
    const token = normalizeToken(body.token);
    if (!token) return invalidPayload('token push Expo non valido');

    const platform = normalizePlatform(body.platform);
    if (!platform) return invalidPayload('platform non valida (atteso ios|android)');

    const now = new Date().toISOString();
    const deviceId = normalizeDeviceId(body.device_id);

    const { data, error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          device_id: deviceId,
          enabled: true,
          last_seen_at: now,
        },
        { onConflict: 'token' }
      )
      .select('id, user_id, token, platform, device_id, enabled, created_at, updated_at, last_seen_at')
      .single();

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
