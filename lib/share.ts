export type SharePayload = {
  title: string;
  text?: string | null;
  url?: string | null;
};

export interface ShareCapableNavigator extends Navigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Clipboard & { writeText?: (data: string) => Promise<void> };
}

function getNavigator(): ShareCapableNavigator | null {
  if (typeof navigator === 'undefined') return null;
  return navigator as ShareCapableNavigator;
}

/**
 * Resolve a URL for sharing purposes. If a relative path is provided,
 * it is converted into an absolute URL using window.location.origin when available.
 */
export function resolveShareUrl(raw?: string | null): string {
  if (!raw || !raw.trim()) {
    if (typeof window !== 'undefined' && window.location?.href) return window.location.href;
    return '';
  }

  const value = raw.trim();
  try {
    // Already an absolute URL
    const asUrl = new URL(value);
    return asUrl.toString();
  } catch {
    // Fallback for relative paths
    if (typeof window !== 'undefined' && window.location?.origin) {
      try {
        return new URL(value, window.location.origin).toString();
      } catch {
        return value;
      }
    }
    return value;
  }
}

export async function shareViaWebApi(payload: SharePayload): Promise<{ usedNative: boolean; error: Error | null }> {
  const nav = getNavigator();
  const shareData: ShareData = {
    title: payload.title,
    text: payload.text ?? undefined,
    url: payload.url ?? undefined,
  };

  if (nav?.share) {
    try {
      await nav.share(shareData);
      return { usedNative: true, error: null };
    } catch (err: any) {
      if (err?.name === 'AbortError') return { usedNative: true, error: null };
      return { usedNative: true, error: err instanceof Error ? err : new Error('share_error') };
    }
  }

  return { usedNative: false, error: null };
}

export async function copyLinkToClipboard(url: string): Promise<boolean> {
  const nav = getNavigator();
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(url);
      return true;
    } catch {
      // continue to fallback
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function buildFeedPostShareUrl(postId: string): string {
  const suffix = `/feed?post=${encodeURIComponent(postId)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${suffix}`;
  }
  return suffix;
}
