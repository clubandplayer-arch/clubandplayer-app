type PushSummary = {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
};

type SendPushParams = {
  supabase: any;
  userId: string;
  notificationId: string;
  kind: string;
  payload?: Record<string, any> | null;
};

const EXCLUDED_KINDS = new Set<string>();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function createSummary(partial?: Partial<PushSummary>): PushSummary {
  return {
    attempted: partial?.attempted ?? 0,
    sent: partial?.sent ?? 0,
    skipped: partial?.skipped ?? 0,
    failed: partial?.failed ?? 0,
  };
}

function toExpoToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token) return null;
  if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) return token;
  return null;
}

function sanitizePreview(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 120);
}

function sanitizeSenderName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 80);
}

function toReactionLabel(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'like') return 'Like';
  if (normalized === 'love') return 'Love';
  if (normalized === 'care') return 'Supporto';
  if (normalized === 'angry') return 'Arrabbiato';
  return 'Reazione';
}

function buildTitle(kind: string, payload?: Record<string, any> | null) {
  if (kind === 'message' || kind === 'new_message') {
    const senderName = sanitizeSenderName(payload?.sender_name);
    return senderName ? `Nuovo messaggio da ${senderName}` : 'Nuovo messaggio';
  }
  if (kind === 'new_comment') {
    const actorName = sanitizeSenderName(payload?.actor_name) || 'Qualcuno';
    return `${actorName} ha commentato il tuo post`;
  }
  if (kind === 'new_reaction') {
    const actorName = sanitizeSenderName(payload?.actor_name) || 'Qualcuno';
    return `${actorName} ha reagito al tuo post`;
  }
  if (kind === 'application_received') return 'Nuova candidatura';
  if (kind === 'application_status') return 'Aggiornamento candidatura';
  return 'Nuova notifica';
}

function buildBody(kind: string, payload?: Record<string, any> | null) {
  if (kind === 'message' || kind === 'new_message') {
    const preview = sanitizePreview(payload?.preview ?? payload?.body);
    return preview || 'Hai ricevuto un nuovo messaggio.';
  }
  if (kind === 'new_comment') {
    const preview = sanitizePreview(payload?.comment_preview ?? payload?.preview ?? payload?.body);
    return preview || 'Hai ricevuto un nuovo commento.';
  }
  if (kind === 'new_reaction') {
    return toReactionLabel(payload?.reaction);
  }

  const textFromPayload = [
    payload?.body,
    payload?.opportunity_title,
    payload?.status,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  if (typeof textFromPayload === 'string' && textFromPayload.trim()) {
    return textFromPayload.trim().slice(0, 140);
  }

  if (kind === 'application_received') return 'Hai ricevuto una nuova candidatura.';
  if (kind === 'application_status') return 'Lo stato della candidatura è stato aggiornato.';
  return 'Apri l’app per vedere i dettagli.';
}

export async function sendPushForNotificationBestEffort(params: SendPushParams): Promise<PushSummary> {
  const { supabase, userId, notificationId, kind, payload } = params;

  if (!supabase || !userId || !notificationId || !kind) {
    return createSummary({ skipped: 1 });
  }

  if (EXCLUDED_KINDS.has(kind)) {
    return createSummary({ skipped: 1 });
  }

  try {
    const { data: tokenRows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (error) {
      console.warn('[push/sendExpoPush] token lookup failed', {
        userId,
        notificationId,
        kind,
        message: error.message,
      });
      return createSummary({ failed: 1 });
    }

    const tokens = (tokenRows ?? [])
      .map((row: any) => toExpoToken(row?.token))
      .filter((token: string | null): token is string => !!token);

    if (!tokens.length) {
      return createSummary({ skipped: 1 });
    }

    const title = buildTitle(kind, payload);
    const body = buildBody(kind, payload);

    let sent = 0;
    let failed = 0;

    await Promise.all(tokens.map(async (token: string) => {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            title,
            body,
            data: {
              kind,
              notificationId,
              ...(payload ?? {}),
            },
          }),
        });

        if (!response.ok) {
          failed += 1;
          console.warn('[push/sendExpoPush] expo response not ok', {
            userId,
            notificationId,
            kind,
            status: response.status,
          });
          return;
        }

        sent += 1;
      } catch (error: any) {
        failed += 1;
        console.warn('[push/sendExpoPush] expo send failed', {
          userId,
          notificationId,
          kind,
          token,
          message: error?.message ?? 'unknown_error',
        });
      }
    }));

    return createSummary({
      attempted: tokens.length,
      sent,
      failed,
    });
  } catch (error: any) {
    console.warn('[push/sendExpoPush] unexpected error', {
      userId,
      notificationId,
      kind,
      message: error?.message ?? 'unknown_error',
    });
    return createSummary({ failed: 1 });
  }
}
