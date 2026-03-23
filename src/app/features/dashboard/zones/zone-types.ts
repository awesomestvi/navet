export type ZoneName = 'hero' | 'actions' | 'status' | 'analytics';

export const ZONE_ORDERED: ZoneName[] = ['hero', 'actions', 'status', 'analytics'];

/** i18n key for each zone label — resolved at render time */
export const ZONE_I18N_KEYS: Record<ZoneName, string> = {
  hero: 'dashboard.zones.hero',
  actions: 'dashboard.zones.actions',
  status: 'dashboard.zones.status',
  analytics: 'dashboard.zones.analytics',
};

/**
 * Default zone for each auto-discovered device type.
 * Used when no explicit zone override has been stored for a card.
 */
export const ZONE_DEFAULTS_BY_DEVICE_TYPE: Record<string, ZoneName> = {
  // Hero — high-level overviews and content
  weather: 'hero',
  calendars: 'hero',
  media: 'hero',
  // Actions — things you tap to toggle or control
  lights: 'actions',
  switches: 'actions',
  locks: 'actions',
  scenes: 'actions',
  covers: 'actions',
  persons: 'actions',
  cameras: 'hero',
  // Status — monitoring and climate
  climate: 'status',
  hvac: 'status',
  power: 'status',
  'grouped-sensors': 'status',
  sensors: 'status',
  vacuums: 'status',
  // Custom widget defaults
  photo: 'hero',
  rss: 'hero',
  note: 'status',
  battery: 'status',
  button: 'actions',
  presence: 'status',
};
