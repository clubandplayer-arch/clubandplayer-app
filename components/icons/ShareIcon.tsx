import { MaterialIcon } from './MaterialIcon';

type ShareIconProps = Omit<Parameters<typeof MaterialIcon>[0], 'name'>;

export default function ShareIcon(props: ShareIconProps) {
  return <MaterialIcon name="share" {...props} />;
}
