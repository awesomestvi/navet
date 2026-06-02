import demoHomeImageAvif from '@assets/reference/marketing/screenshots/navet-ipad-landscape-home.avif';
import demoHomeImage from '@assets/reference/marketing/screenshots/navet-ipad-landscape-home.jpg';
import demoHomeImageWebp from '@assets/reference/marketing/screenshots/navet-ipad-landscape-home.webp';
import demoMobileImageAvif from '@assets/reference/marketing/screenshots/navet-mobile-pwa-home.avif';
import demoMobileImage from '@assets/reference/marketing/screenshots/navet-mobile-pwa-home.jpg';
import demoMobileImageWebp from '@assets/reference/marketing/screenshots/navet-mobile-pwa-home.webp';
import demoTabletImageAvif from '@assets/reference/marketing/screenshots/navet-tablet-portrait-home.avif';
import demoTabletImage from '@assets/reference/marketing/screenshots/navet-tablet-portrait-home.jpg';
import demoTabletImageWebp from '@assets/reference/marketing/screenshots/navet-tablet-portrait-home.webp';
import artworksOriginalAvif from '@assets/reference/media/artworks-original.avif';
import artworksOriginal from '@assets/reference/media/artworks-original.jpg';
import artworksOriginalWebp from '@assets/reference/media/artworks-original.webp';
import cameraSampleImageAvif from '@assets/reference/media/camera-sample.avif';
import cameraSampleImage from '@assets/reference/media/camera-sample.webp';
import type { CalendarCard } from '@navet/app/features/calendar';
import type { HVACCard } from '@navet/app/features/climate';
import type {
  NoteWidget,
  PhotoFrameWidget,
} from '@navet/app/features/dashboard/components/widgets';
import type { MapMarker } from '@navet/app/features/dashboard/components/widgets/map-types';
import type { MapWidget } from '@navet/app/features/dashboard/components/widgets/map-widget';
import type { EnergySeriesPoint } from '@navet/app/features/energy';
import type { FanCard, LightCard, SwitchCard } from '@navet/app/features/lighting';
import type { MediaCard } from '@navet/app/features/media';
import type { PersonCard } from '@navet/app/features/person';
import type { RSSItem, RSSProvider } from '@navet/app/features/rss/components/rss-feed-card/types';
import type { SceneCard } from '@navet/app/features/scenes';
import type { CameraCard, CoverCard, LockCard } from '@navet/app/features/security';
import type { GroupedSensorCard, InfoCard } from '@navet/app/features/sensors';
import type { VacuumCard } from '@navet/app/features/vacuum';
import type { WeatherCard } from '@navet/app/features/weather';
import type { MarketingResponsiveImageSource } from '@navet/app/marketing/components/MarketingResponsiveImage';
import type { ComponentProps } from 'react';

export const MARKETING_SCREENSHOTS = [
  {
    src: demoHomeImage,
    sources: [
      { srcSet: demoHomeImageAvif, type: 'image/avif' },
      { srcSet: demoHomeImageWebp, type: 'image/webp' },
    ] satisfies readonly MarketingResponsiveImageSource[],
    alt: 'Navet home dashboard shown on a landscape iPad layout',
    label: 'Landscape dashboard',
  },
  {
    src: demoTabletImage,
    sources: [
      { srcSet: demoTabletImageAvif, type: 'image/avif' },
      { srcSet: demoTabletImageWebp, type: 'image/webp' },
    ] satisfies readonly MarketingResponsiveImageSource[],
    alt: 'Navet home dashboard shown on a portrait tablet layout',
    label: 'Portrait tablet',
  },
  {
    src: demoMobileImage,
    sources: [
      { srcSet: demoMobileImageAvif, type: 'image/avif' },
      { srcSet: demoMobileImageWebp, type: 'image/webp' },
    ] satisfies readonly MarketingResponsiveImageSource[],
    alt: 'Navet home dashboard shown on a phone layout',
    label: 'Phone layout',
  },
] as const;

export const MARKETING_MEDIA_SOURCES = {
  artworksOriginal: [
    { srcSet: artworksOriginalAvif, type: 'image/avif' },
    { srcSet: artworksOriginalWebp, type: 'image/webp' },
  ] satisfies readonly MarketingResponsiveImageSource[],
  cameraSample: [
    { srcSet: cameraSampleImageAvif, type: 'image/avif' },
  ] satisfies readonly MarketingResponsiveImageSource[],
} as const;

export const MARKETING_PREVIEW_CARDS = {
  weather: {
    id: 'weather.home',
    location: 'Stockholm, Sweden',
    temperature: 18,
    feelsLikeTemperature: 17,
    condition: 'partly-cloudy',
    humidity: 58,
    windSpeed: 12,
    windSpeedUnit: 'km/h',
    windGustSpeed: 18,
    pressure: 1014,
    pressureUnit: 'hPa',
    uvIndex: 4.2,
    cloudCoverage: 36,
    precipitation: 0.1,
    precipitationUnit: 'mm',
    sunrise: '05:11',
    sunset: '21:17',
    daylight: '16h 06m',
    rainForecast: 'Dry through the afternoon',
    forecastMode: 'weekly',
    forecast: [
      { day: 'Mon', condition: 'sunny', high: 20, low: 11 },
      { day: 'Tue', condition: 'partly-cloudy', high: 19, low: 10 },
      { day: 'Wed', condition: 'rainy', high: 16, low: 9 },
      { day: 'Thu', condition: 'cloudy', high: 17, low: 10 },
      { day: 'Fri', condition: 'sunny', high: 21, low: 12 },
      { day: 'Sat', condition: 'sunny', high: 22, low: 13 },
      { day: 'Sun', condition: 'partly-cloudy', high: 18, low: 11 },
    ],
    highTemp: 20,
    lowTemp: 11,
    size: 'large',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof WeatherCard>, 'onSizeChange'>,
  calendar: {
    id: 'calendar.family',
    name: 'Family Calendar',
    room: 'Home',
    events: [
      {
        id: 'waste',
        title: 'Waste pickup',
        startTime: '--',
        endTime: '--',
        timeDisplay: '--',
        startDateTime: '2026-06-01T00:00:00.000Z',
        isAllDay: true,
        type: 'event',
        color: '#f59e0b',
        sortKey: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'installer',
        title: 'Call with installer',
        startTime: '13:00',
        endTime: '13:30',
        timeDisplay: '13:00',
        startDateTime: '2026-06-02T13:00:00.000Z',
        endDateTime: '2026-06-02T13:30:00.000Z',
        type: 'call',
        color: '#34d399',
        sortKey: '2026-06-02T13:00:00.000Z',
      },
      {
        id: 'review',
        title: 'Design review',
        startTime: '18:30',
        endTime: '19:15',
        timeDisplay: '18:30',
        startDateTime: '2026-06-03T18:30:00.000Z',
        endDateTime: '2026-06-03T19:15:00.000Z',
        type: 'meeting',
        color: '#60a5fa',
        sortKey: '2026-06-03T18:30:00.000Z',
      },
    ],
    inEditMode: false,
    size: 'medium',
  } satisfies Omit<ComponentProps<typeof CalendarCard>, 'onSizeChange'>,
  hvac: {
    id: 'climate.main_floor',
    name: 'Main Floor HVAC',
    room: 'Hallway',
    initialTemp: 22,
    initialCurrentTemp: 21,
    initialMode: 'cool',
    initialAction: 'cooling',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof HVACCard>, 'onSizeChange'>,
  media: {
    id: 'media_player.living_room_speaker',
    name: 'Living Room Speaker',
    room: 'Living Room',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    entityType: 'Speaker',
    entityPicture: artworksOriginal,
    state: 'playing',
    volume: 42,
    isMuted: false,
    elapsedSeconds: 86,
    durationSeconds: 243,
    positionUpdatedAt: '2026-05-30T10:15:00.000Z',
    supportsGrouping: true,
    groupMembers: ['Kitchen Speaker'],
    size: 'medium',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof MediaCard>, 'onSizeChange'>,
} as const;

export const MARKETING_BENTO_CARDS = {
  weather: {
    ...MARKETING_PREVIEW_CARDS.weather,
  } satisfies Omit<ComponentProps<typeof WeatherCard>, 'onSizeChange'>,
  calendar: {
    ...MARKETING_PREVIEW_CARDS.calendar,
  } satisfies Omit<ComponentProps<typeof CalendarCard>, 'onSizeChange'>,
  camera: {
    id: 'camera.front_door',
    name: 'Front Door Cam',
    room: 'Entrance',
    entityPicture: cameraSampleImage,
    supportedFeatures: 2,
    isStreamCapable: true,
    size: 'large',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof CameraCard>, 'onSizeChange'>,
  cover: {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    initialPosition: 72,
    hasPosition: true,
    supportedFeatures: 15,
    initialDeviceClass: 'blind',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof CoverCard>, 'onSizeChange'>,
  light: {
    id: 'light.kitchen_pendants',
    name: 'Kitchen Pendants',
    room: 'Kitchen',
    initialState: true,
    initialBrightness: 72,
    initialTemp: 3200,
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof LightCard>, 'onSizeChange'>,
  lightColor: {
    id: 'light.reading_nook',
    name: 'Reading Nook',
    room: 'Living Room',
    initialState: true,
    initialBrightness: 78,
    initialTemp: 2900,
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof LightCard>, 'onSizeChange'>,
  switch: {
    id: 'switch.espresso_machine',
    name: 'Espresso Machine',
    size: 'small',
    initialState: true,
    entityType: 'switch',
    serviceDomain: 'switch',
    serviceAction: 'toggle',
    isEditMode: false,
    power: 1140,
    voltage: 230,
    energy: 2.6,
  } satisfies ComponentProps<typeof SwitchCard>,
  fan: {
    id: 'fan.ceiling_fan',
    name: 'Ceiling Fan',
    room: 'Bedroom',
    initialState: true,
    initialPercentage: 66,
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof FanCard>, 'onSizeChange'>,
  scene: {
    id: 'scene.movie_mode',
    name: 'Movie Mode',
    room: 'Living Room',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof SceneCard>, 'onSizeChange'>,
  person: {
    id: 'person.alex',
    name: 'Alex',
    room: 'Home',
    location: 'Office',
    state: 'home',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof PersonCard>, 'onSizeChange'>,
  temperature: {
    id: 'sensor.living_room_temperature',
    name: 'Temperature',
    room: 'Living Room',
    value: '21.8',
    unit: '°C',
    icon: 'thermometer',
    subtitle: 'temperature',
    deviceClass: 'temperature',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof InfoCard>, 'onSizeChange'>,
  airQuality: {
    id: 'sensor.bedroom_co2',
    name: 'Air Quality',
    room: 'Bedroom',
    value: 'Excellent',
    unit: '',
    icon: 'wind',
    subtitle: 'carbon dioxide',
    deviceClass: 'carbon_dioxide',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof InfoCard>, 'onSizeChange'>,
  energyNow: {
    id: 'sensor.home_energy_now',
    name: 'Energy Now',
    room: 'Home',
    value: '4.8',
    unit: 'kW',
    icon: 'zap',
    subtitle: 'power',
    deviceClass: 'power',
    size: 'medium',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof InfoCard>, 'onSizeChange'>,
  motion: {
    id: 'binary_sensor.hall_motion',
    name: 'Motion Sensor',
    room: 'Hallway',
    value: 'Clear',
    unit: '',
    icon: 'motion',
    subtitle: 'motion',
    deviceClass: 'motion',
    status: 'clear',
    size: 'small',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof InfoCard>, 'onSizeChange'>,
  groupedSensors: {
    id: 'grouped_sensors.living_room_air',
    name: 'Living Room Air',
    room: 'Living Room',
    sensors: [
      { id: 'sensor.temp', label: 'Temp', value: '22.4', unit: 'C', icon: 'thermometer' },
      { id: 'sensor.hum', label: 'Humidity', value: '47', unit: '%', icon: 'droplets' },
      { id: 'sensor.co2', label: 'CO2', value: '510', unit: 'ppm', icon: 'gauge' },
      { id: 'sensor.pm25', label: 'PM2.5', value: '8', unit: 'ug/m3', icon: 'activity' },
    ],
    size: 'small',
    isEditMode: false,
    accentColor: 'teal',
  } satisfies Omit<ComponentProps<typeof GroupedSensorCard>, 'onSizeChange'>,
  lock: {
    id: 'lock.front_door',
    name: 'Front Door',
    initialState: true,
    size: 'small',
    isEditMode: false,
  } satisfies ComponentProps<typeof LockCard>,
  vacuum: {
    id: 'vacuum.robby',
    name: 'Robby',
    room: 'Ground Floor',
    status: 'cleaning',
    battery: 74,
    cleanedArea: '42 m²',
    cleaningTime: '38 min',
    size: 'medium',
    isEditMode: false,
  } satisfies Omit<ComponentProps<typeof VacuumCard>, 'onSizeChange'>,
} as const;

export const MARKETING_BENTO_RSS_PROVIDERS = [
  {
    id: 'navet-blog',
    name: 'Navet',
    type: 'url',
    feedUrl: 'https://navet.app/feed.xml',
  },
  {
    id: 'smart-home',
    name: 'Smart Home',
    type: 'url',
    feedUrl: 'https://example.com/smart-home.xml',
  },
] as const satisfies readonly RSSProvider[];

export const MARKETING_BENTO_RSS_ITEMS = [
  {
    id: 'launch',
    title: 'Designing calm room-first dashboards',
    source: 'Navet',
    timeAgo: '2h ago',
    url: 'https://navet.app/blog/designing-calm-room-first-dashboards',
    excerpt: 'How Navet balances glanceable controls with richer room context.',
    imageUrl: demoHomeImage,
  },
  {
    id: 'automation',
    title: 'Automation ideas for brighter summer evenings',
    source: 'Smart Home',
    timeAgo: '5h ago',
    url: 'https://example.com/automation-ideas-summer-evenings',
    excerpt: 'Scene recipes for lights, media, and shades when the sun stays out late.',
    imageUrl: demoTabletImage,
  },
  {
    id: 'providers',
    title: 'What multi-provider support should feel like',
    source: 'Navet',
    timeAgo: '1d ago',
    url: 'https://navet.app/blog/multi-provider-support',
    excerpt: 'A look at how Home Assistant, Homey, and openHAB fit into the product.',
    imageUrl: demoMobileImage,
  },
] as const satisfies readonly RSSItem[];

export const MARKETING_BENTO_MAP_MARKERS = [
  {
    id: 'alex-phone',
    name: 'Alex',
    latitude: 59.3346,
    longitude: 18.0632,
    state: 'Home',
  },
  {
    id: 'sam-bike',
    name: 'Sam',
    latitude: 59.3293,
    longitude: 18.0686,
    state: 'Cycling',
  },
  {
    id: 'car',
    name: 'Polestar 2',
    latitude: 59.3427,
    longitude: 18.0485,
    state: 'Charging',
  },
] as const satisfies readonly MapMarker[];

export const MARKETING_BENTO_WIDGETS = {
  note: {
    initialNote:
      'Remember to lower the blinds before movie mode, start the espresso machine at 06:45, and leave the hallway lights warm after sunset.',
  } satisfies ComponentProps<typeof NoteWidget>,
  map: {
    size: 'medium',
    markers: MARKETING_BENTO_MAP_MARKERS,
  } satisfies ComponentProps<typeof MapWidget>,
  photo: {
    size: 'medium',
    sourceMode: 'urls',
    photoUrls: [demoHomeImage, demoTabletImage, demoMobileImage],
  } satisfies ComponentProps<typeof PhotoFrameWidget>,
} as const;

export const MARKETING_BENTO_ENERGY_TREND = [
  { value: 0.18, label: '00:00', timestampMs: 1717041600000 },
  { value: 0.22, label: '', timestampMs: 1717042200000 },
  { value: 3.2, label: '', timestampMs: 1717042800000 },
  { value: 0.16, label: '', timestampMs: 1717043400000 },
  { value: 0.14, label: '', timestampMs: 1717044000000 },
  { value: 0.2, label: '', timestampMs: 1717044600000 },
  { value: 3.3, label: '', timestampMs: 1717045200000 },
  { value: 0.18, label: '', timestampMs: 1717045800000 },
  { value: 0.12, label: '', timestampMs: 1717046400000 },
  { value: 2.6, label: '', timestampMs: 1717047000000 },
  { value: 2.9, label: '', timestampMs: 1717047600000 },
  { value: 0.24, label: '', timestampMs: 1717048200000 },
  { value: 3.9, label: '', timestampMs: 1717048800000 },
  { value: 0.2, label: '', timestampMs: 1717049400000 },
  { value: 0.16, label: '', timestampMs: 1717050000000 },
  { value: 3.1, label: '', timestampMs: 1717050600000 },
  { value: 0.18, label: '', timestampMs: 1717051200000 },
  { value: 3.7, label: '', timestampMs: 1717051800000 },
  { value: 0.22, label: '', timestampMs: 1717052400000 },
  { value: 0.16, label: '', timestampMs: 1717053000000 },
  { value: 3.4, label: '', timestampMs: 1717053600000 },
  { value: 0.2, label: '11:15', timestampMs: 1717054200000 },
  { value: 3.8, label: '', timestampMs: 1717054800000 },
  { value: 0.14, label: '', timestampMs: 1717055400000 },
  { value: 0.16, label: '', timestampMs: 1717056000000 },
  { value: 2.8, label: '', timestampMs: 1717056600000 },
  { value: 0.18, label: '', timestampMs: 1717057200000 },
  { value: 0.08, label: '', timestampMs: 1717057800000 },
  { value: 0.06, label: '', timestampMs: 1717058400000 },
  { value: 0.09, label: '', timestampMs: 1717059000000 },
  { value: 0.1, label: '', timestampMs: 1717059600000 },
  { value: 0.12, label: '', timestampMs: 1717060200000 },
  { value: 0.11, label: '', timestampMs: 1717060800000 },
  { value: 0.14, label: '', timestampMs: 1717061400000 },
  { value: 0.13, label: '', timestampMs: 1717062000000 },
  { value: 0.16, label: '', timestampMs: 1717062600000 },
  { value: 0.15, label: '', timestampMs: 1717063200000 },
  { value: 0.18, label: '', timestampMs: 1717063800000 },
  { value: 0.16, label: '', timestampMs: 1717064400000 },
  { value: 0.2, label: '', timestampMs: 1717065000000 },
  { value: 0.19, label: '', timestampMs: 1717065600000 },
  { value: 0.22, label: '', timestampMs: 1717066200000 },
  { value: 0.2, label: '', timestampMs: 1717066800000 },
  { value: 0.26, label: '', timestampMs: 1717067400000 },
  { value: 0.24, label: '', timestampMs: 1717068000000 },
  { value: 0.3, label: '', timestampMs: 1717068600000 },
  { value: 0.26, label: '', timestampMs: 1717069200000 },
  { value: 0.34, label: '', timestampMs: 1717069800000 },
  { value: 0.28, label: '', timestampMs: 1717070400000 },
  { value: 0.4, label: '', timestampMs: 1717071000000 },
  { value: 0.3, label: '', timestampMs: 1717071600000 },
  { value: 0.18, label: '', timestampMs: 1717072200000 },
  { value: 0.16, label: '', timestampMs: 1717072800000 },
  { value: 0.22, label: '', timestampMs: 1717073400000 },
  { value: 0.2, label: '', timestampMs: 1717074000000 },
  { value: 0.24, label: '', timestampMs: 1717074600000 },
  { value: 3.1, label: 'Now', timestampMs: 1717075200000 },
] as const satisfies readonly EnergySeriesPoint[];
