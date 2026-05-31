/**
 * Centralized map tile constants for the application
 * Avoid hardcoded map tile URLs throughout the codebase
 */

import { CARTO_ATTRIBUTION_URL, OPENSTREETMAP_COPYRIGHT_URL } from './urls';

/** CartoDB light theme tile URL */
export const CARTO_LIGHT_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/** CartoDB dark theme tile URL */
export const CARTO_DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

/** Map attribution HTML */
export const MAP_ATTRIBUTION_HTML =
  `&copy; <a href="${OPENSTREETMAP_COPYRIGHT_URL}">OpenStreetMap</a> contributors ` +
  `&copy; <a href="${CARTO_ATTRIBUTION_URL}">CARTO</a>`;

/** Default map zoom level */
export const DEFAULT_MAP_ZOOM = 12;

/** Minimum map zoom level */
export const MIN_MAP_ZOOM = 1;

/** Maximum map zoom level */
export const MAX_MAP_ZOOM = 19;
