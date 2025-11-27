import type { MaterialIconProps } from './MaterialIcon';
import { MaterialIcon } from './MaterialIcon';

type NavIconProps = Omit<MaterialIconProps, 'name'>;

export function NavMenuIcon(props: NavIconProps) {
  return <MaterialIcon name="menu" {...props} />;
}

export function NavCloseIcon(props: NavIconProps) {
  return <MaterialIcon name="close" {...props} />;
}
