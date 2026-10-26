import { icon, type IconName } from './icons';
export function Icon({ name }: { name: IconName }) {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
}
