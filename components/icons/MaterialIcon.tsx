import type { ReactNode, SVGProps } from 'react';

export type MaterialIconName =
  | 'home'
  | 'mail'
  | 'notifications'
  | 'following'
  | 'media'
  | 'opportunities'
  | 'applications'
  | 'globe'
  | 'menu'
  | 'close'
  | 'edit'
  | 'delete'
  | 'share'
  | 'calendar'
  | 'photo'
  | 'video';

const paths: Record<MaterialIconName, ReactNode> = {
  home: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />, // material home
  mail: (
    <>
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <path d="m4 8 8 5 8-5" />
    </>
  ),
  notifications: (
    <>
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />
      <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
    </>
  ),
  following: (
    <>
      <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M8 13c-2.67 0-6 1.34-6 4v2h12v-2c0-2.66-3.33-4-6-4Z" />
      <path d="M16 13c-.66 0-1.31.07-1.95.2C15.72 13.98 17 15.36 17 17v2h5v-2.5c0-2.42-3.33-3.5-6-3.5Z" />
    </>
  ),
  media: (
    <>
      <path d="M5 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1H5a2 2 0 0 1-2-2Z" />
      <path d="M9 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M5 18.5 10 13l3 3 2.5-2.5L20 18.5" />
    </>
  ),
  opportunities: (
    <>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      <path d="m10.5 14.5-3-3 1.4-1.4 1.6 1.6 5-5L16.9 8l-6.4 6.5Z" />
    </>
  ),
  applications: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
      <path d="M8 9h2" />
    </>
  ),
  globe: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
      <path d="M12 3c2.5 2.3 3.75 5.3 3.75 9S14.5 18.7 12 21" />
      <path d="M12 3c-2.5 2.3-3.75 5.3-3.75 9S9.5 18.7 12 21" />
      <path d="M3 12h18" />
      <path d="M5 7.5c2.5 1.5 5 2.25 7 2.25s4.5-.75 7-2.25" />
      <path d="M5 16.5c2.5-1.5 5-2.25 7-2.25s4.5.75 7 2.25" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16v2H4z" />
      <path d="M4 11h16v2H4z" />
      <path d="M4 16h16v2H4z" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </>
  ),
  edit: (
    <>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" />
      <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
    </>
  ),
  delete: (
    <>
      <path d="M6 7h12" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
    </>
  ),
  share: (
    <>
      <path d="M18 16a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z" />
      <path d="M6 12a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z" />
      <path d="M18 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z" />
      <path d="M8 13.5 16 9" />
      <path d="M8 15.5 16 19" />
    </>
  ),
  calendar: (
    <>
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </>
  ),
  photo: (
    <>
      <path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
      <path d="m4 17 4.5-5.5 3.5 4.5 2.5-3L20 17" />
      <circle cx="8" cy="9" r="1.5" />
    </>
  ),
  video: (
    <>
      <path d="M5 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M17 10.5 21 8v8l-4-2.5Z" />
    </>
  ),
};

type MaterialIconProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'name'> & {
  name: MaterialIconName;
  title?: string;
};

export type { MaterialIconProps };

export function MaterialIcon({ name, title, className, ...props }: MaterialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden={title ? undefined : true}
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
