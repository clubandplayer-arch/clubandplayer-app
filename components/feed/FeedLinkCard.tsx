import { domainFromUrl } from '@/components/feed/postShared';
import { getYouTubeEmbedUrl, getYouTubeVideoId } from '@/lib/media/youtube';

type Props = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

export function FeedLinkCard({ url, title, description, image }: Props) {
  const youtubeVideoId = getYouTubeVideoId(url);

  if (youtubeVideoId) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm">
        <div className="relative aspect-video w-full">
          <iframe
            src={getYouTubeEmbedUrl(youtubeVideoId)}
            title={title || 'Video YouTube'}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        {title || description ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="block space-y-1 bg-white px-3 py-2 transition hover:bg-slate-50"
          >
            <div className="text-xs uppercase text-gray-500">YouTube</div>
            {title ? <div className="line-clamp-2 text-sm font-semibold text-gray-900">{title}</div> : null}
            {description ? <div className="line-clamp-2 text-xs text-gray-600">{description}</div> : null}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm transition hover:shadow-md"
    >
      <div className="flex gap-3 p-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title || url} className="h-20 w-28 flex-shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase text-gray-500">{domainFromUrl(url)}</div>
          <div className="line-clamp-2 text-sm font-semibold text-gray-900">{title || url}</div>
          {description ? <div className="line-clamp-2 text-xs text-gray-600">{description}</div> : null}
        </div>
      </div>
    </a>
  );
}
