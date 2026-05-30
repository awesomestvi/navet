/**
 * Centralized URL constants for the application
 * Avoid hardcoded URLs throughout the codebase
 */

/** Default Home Assistant URL placeholder for login */
export const DEFAULT_HASS_URL_PLACEHOLDER = 'http://homeassistant.local:8123';

/** Example RSS feed URL for settings placeholder */
export const EXAMPLE_RSS_FEED_URL = 'https://example.com/feed.xml';

/** Example photo URL for photo frame widget placeholder */
export const EXAMPLE_PHOTO_URL = 'https://example.com/photo.jpg';

/** OpenStreetMap copyright URL */
export const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/** CARTO attribution URL */
export const CARTO_ATTRIBUTION_URL = 'https://carto.com/attributions';

/** GitHub repository URL */
export const GITHUB_REPO_URL = 'https://github.com/awesomestvi/navet';

/** Documentation URLs */
export const DOCS_URLS = {
  homeAssistant: 'https://www.home-assistant.io/',
  haWebsocketApi: 'https://developers.home-assistant.io/docs/api/websocket/',
  opencode: 'https://opencode.ai',
} as const;
