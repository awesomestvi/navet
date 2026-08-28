import { OPENFREEMAP_DARK_STYLE_URL, OPENFREEMAP_LIGHT_STYLE_URL } from '@navet/app/constants';

export function getMapStyleUrl(theme: string): string {
  return theme === 'light' ? OPENFREEMAP_LIGHT_STYLE_URL : OPENFREEMAP_DARK_STYLE_URL;
}
