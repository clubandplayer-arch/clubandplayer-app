import type { ComponentType, SVGProps } from 'react';

// Wrapper icone stile Flaticon: possono essere sostituite in futuro con SVG locali
// (es. import da public/icons) modificando le variabili Local*Icon qui sotto.
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LocalEditIcon: IconComponent | null = null;
const LocalDeleteIcon: IconComponent | null = null;
const LocalShareIcon: IconComponent | null = null;

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
};

function DefaultEditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DefaultDeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" />
      <path d="M10 11v6" strokeLinecap="round" />
      <path d="M14 11v6" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" />
    </svg>
  );
}

function DefaultShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22 2-7 20-4-9-9-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PostIconEdit(props: SVGProps<SVGSVGElement>) {
  const Icon = LocalEditIcon ?? DefaultEditIcon;
  return <Icon {...props} />;
}

export function PostIconDelete(props: SVGProps<SVGSVGElement>) {
  const Icon = LocalDeleteIcon ?? DefaultDeleteIcon;
  return <Icon {...props} />;
}

export function PostIconShare(props: SVGProps<SVGSVGElement>) {
  const Icon = LocalShareIcon ?? DefaultShareIcon;
  return <Icon {...props} />;
}
