import type { SVGProps } from 'react';
import { MaterialIcon } from './MaterialIcon';

export function PostIconEdit(props: SVGProps<SVGSVGElement>) {
  return <MaterialIcon name="edit" {...props} />;
}

export function PostIconDelete(props: SVGProps<SVGSVGElement>) {
  return <MaterialIcon name="delete" {...props} />;
}

export function PostIconShare(props: SVGProps<SVGSVGElement>) {
  return <MaterialIcon name="share" {...props} />;
}
