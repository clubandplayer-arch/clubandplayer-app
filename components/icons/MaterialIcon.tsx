import type { CSSProperties, HTMLAttributes } from 'react';

export type MaterialIconName =
  | 'home'
  | 'mail'
  | 'notifications'
  | 'following'
  | 'media'
  | 'opportunities'
  | 'applications'
  | 'network'
  | 'person'
  | 'globe'
  | 'menu'
  | 'close'
  | 'edit'
  | 'delete'
  | 'share'
  | 'calendar'
  | 'photo'
  | 'video'
  | 'refresh'
  | 'send'
  | 'sentiment_satisfied';

const glyphs: Record<MaterialIconName, string> = {
  home: 'home',
  mail: 'mail',
  notifications: 'notifications',
  following: 'group',
  media: 'collections',
  opportunities: 'work',
  applications: 'article',
  network: 'diversity_3',
  person: 'person',
  globe: 'language',
  menu: 'menu',
  close: 'close',
  edit: 'edit',
  delete: 'delete',
  share: 'share',
  calendar: 'calendar_month',
  photo: 'photo_library',
  video: 'videocam',
  refresh: 'refresh',
  send: 'send',
  sentiment_satisfied: 'sentiment_satisfied',
};

type MaterialIconFontSize = 'inherit' | 'small' | 'medium' | 'large';

type MaterialIconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  name: MaterialIconName;
  title?: string;
  fill?: 0 | 1;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: -25 | 0 | 200;
  opticalSize?: 20 | 24 | 40 | 48;
  fontSize?: MaterialIconFontSize | number | string;
};

function resolveFontSize(fontSize?: MaterialIconProps['fontSize']) {
  if (fontSize === undefined) return undefined;
  if (typeof fontSize === 'number') return `${fontSize}px`;
  if (fontSize === 'inherit') return 'inherit';
  if (fontSize === 'small') return '20px';
  if (fontSize === 'medium') return '24px';
  if (fontSize === 'large') return '32px';
  return fontSize;
}

export type { MaterialIconProps };

export function MaterialIcon({
  name,
  title,
  className,
  fill = 0,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  fontSize,
  style,
  ...props
}: MaterialIconProps) {
  const fontVariationSettings = `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`;
  const computedFontSize = resolveFontSize(fontSize);

  const mergedStyle: CSSProperties = {
    fontVariationSettings,
    ...(computedFontSize ? { fontSize: computedFontSize } : {}),
    ...(style || {}),
  };

  return (
    <span
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      title={title}
      className={className ? `material-symbols-outlined ${className}` : 'material-symbols-outlined'}
      style={mergedStyle}
      {...props}
    >
      {glyphs[name]}
    </span>
  );
}
