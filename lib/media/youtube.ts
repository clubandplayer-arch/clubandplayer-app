const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Returns the video id for the common YouTube share URL formats. */
export function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate: string | null = null;

    if (hostname === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com') {
      if (url.pathname === '/watch') candidate = url.searchParams.get('v');
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) {
        candidate = url.pathname.split('/').filter(Boolean)[1] ?? null;
      }
    }

    return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
