import {
  CARTO_DARK_TILE_URL,
  CARTO_LIGHT_TILE_URL,
  MAP_ATTRIBUTION_HTML,
} from '@navet/app/constants';

export function getTileUrl(theme: string): string {
  return theme === 'light' ? CARTO_LIGHT_TILE_URL : CARTO_DARK_TILE_URL;
}

export const TILE_ATTRIBUTION = MAP_ATTRIBUTION_HTML;
