import type { SVGProps } from 'react';
import { MaterialIcon } from './MaterialIcon';

export function NavMenuIcon(props: SVGProps<SVGSVGElement>) {
  return <MaterialIcon name="menu" {...props} />;
}

export function NavCloseIcon(props: SVGProps<SVGSVGElement>) {
  return <MaterialIcon name="close" {...props} />;
}
