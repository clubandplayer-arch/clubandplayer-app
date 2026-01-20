export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  copiedMessage?: string;
};

export function getPostPermalink(origin: string, postId: string) {
  const base = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${base}/posts/${postId}`;
}

export async function createPostShareLink(postId: string): Promise<string> {
  const res = await fetch('/api/share-links', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: 'post', resourceId: postId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const message = json?.message || json?.error || 'Impossibile creare il link di condivisione';
    throw new Error(message);
  }
  const url = json?.shareLink?.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('Link di condivisione non disponibile');
  }
  return url;
}

export type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

export type ShareResult = 'shared' | 'dismissed' | 'copied' | 'noop' | 'failed';

function buildShareData(payload: SharePayload): ShareData {
  const data: ShareData = {};
  if (payload.title) data.title = payload.title;
  if (payload.text) data.text = payload.text;
  if (payload.url) data.url = payload.url;
  return data;
}

export async function shareOrCopyLink(payload: SharePayload): Promise<ShareResult> {
  if (typeof window === 'undefined') return 'noop';

  const navigatorWithShare = window.navigator as ShareCapableNavigator;
  const data = buildShareData(payload);

  if (navigatorWithShare.share) {
    try {
      await navigatorWithShare.share(data);
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'dismissed';
    }
  }

  if (payload.url) {
    try {
      if (navigatorWithShare.clipboard?.writeText) {
        await navigatorWithShare.clipboard.writeText(payload.url);
      } else {
        const tmp = document.createElement('input');
        tmp.value = payload.url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      window.alert(payload.copiedMessage || 'Link copiato negli appunti');
      return 'copied';
    } catch {
      window.alert('Impossibile condividere');
      return 'failed';
    }
  }

  window.alert('Impossibile condividere');
  return 'failed';
}
