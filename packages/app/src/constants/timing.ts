/**
 * Centralized timing constants for the application
 * Avoid magic numbers throughout the codebase
 */

/** Weather forecast refresh interval (15 minutes) */
export const WEATHER_FORECAST_REFRESH_INTERVAL = 15 * 60 * 1000;

/** Calendar events refresh interval (5 minutes) */
export const CALENDAR_EVENTS_REFRESH_INTERVAL = 5 * 60 * 1000;

/** Energy statistics refresh interval (5 minutes) */
export const ENERGY_STATISTICS_REFRESH_INTERVAL = 5 * 60 * 1000;

/** Dashboard arrival reveal animation delay */
export const DASHBOARD_ARRIVAL_REVEAL_DELAY = 3200;

/** Dashboard arrival complete delay */
export const DASHBOARD_ARRIVAL_COMPLETE_DELAY = 900;

/** Progressive batching timeout */
export const PROGRESSIVE_BATCHING_TIMEOUT = 160;

/** Default debounce delay for search inputs */
export const SEARCH_DEBOUNCE_DELAY = 300;

/** Default animation duration for transitions */
export const TRANSITION_DURATION_MS = 200;

/** Card size change observation timeout */
export const CARD_SIZE_OBSERVER_TIMEOUT = 100;
