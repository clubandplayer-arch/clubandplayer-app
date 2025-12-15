const EVENT_NAME = 'cp:video-play';

type PlaybackDetail = {
  id: string;
};

export function emitExclusiveVideoPlay(id: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PlaybackDetail>(EVENT_NAME, { detail: { id } }));
}

export function subscribeExclusiveVideoPlay(callback: (id: string) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const custom = event as CustomEvent<PlaybackDetail>;
    const otherId = custom.detail?.id;
    if (!otherId) return;
    callback(otherId);
  };

  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}
