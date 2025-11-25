import type { ComponentType, SVGProps } from 'react';

// Wrapper per le icone del menu responsive: sostituibili con SVG locali in futuro.
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LocalMenuIcon: IconComponent | null = null;
const LocalCloseIcon: IconComponent | null = null;

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
};

function DefaultMenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M3 12h18" strokeLinecap="round" />
      <path d="M3 18h18" strokeLinecap="round" />
    </svg>
  );
}

function DefaultCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 5l14 14" strokeLinecap="round" />
      <path d="M19 5 5 19" strokeLinecap="round" />
    </svg>
  );
}

export function NavMenuIcon(props: SVGProps<SVGSVGElement>) {
  const Icon = LocalMenuIcon ?? DefaultMenuIcon;
  return <Icon {...props} />;
}

export function NavCloseIcon(props: SVGProps<SVGSVGElement>) {
  const Icon = LocalCloseIcon ?? DefaultCloseIcon;
  return <Icon {...props} />;
}
