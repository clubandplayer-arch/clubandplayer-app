import type { MaterialIconProps } from './MaterialIcon';
import { MaterialIcon } from './MaterialIcon';

type PostActionIconProps = Omit<MaterialIconProps, 'name'>;

export function PostIconEdit(props: PostActionIconProps) {
  return <MaterialIcon name="edit" {...props} />;
}

export function PostIconDelete(props: PostActionIconProps) {
  return <MaterialIcon name="delete" {...props} />;
}

export function PostIconShare(props: PostActionIconProps) {
  return <MaterialIcon name="share" {...props} />;
}
