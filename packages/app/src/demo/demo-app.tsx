import cameraSampleImageAvif from '@assets/reference/media/camera-sample.avif';
import cameraSampleImageWebp from '@assets/reference/media/camera-sample.webp';
import {
  RUNTIME_SAMPLE_MEDIA,
  RUNTIME_SAMPLE_SCREENSHOTS,
} from '@navet/app/assets/runtime-sample-images';
import { AuthProvider } from '@navet/app/auth/AuthProvider';
import { RoomNav } from '@navet/app/components/layout/room-nav';
import {
  DashboardEmptyState,
  DashboardHeroSection,
  SectionCard,
} from '@navet/app/components/patterns';
import { Badge, Button, Panel, Switch, Tag } from '@navet/app/components/primitives';
import {
  type CardSize,
  getCardGridAutoRowsStyle,
  getCardSpanClass,
  getDashboardCardFootprint,
  getDashboardGridColumnCount,
} from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';
import { CalendarCard } from '@navet/app/features/calendar/components/calendar-card';
import { HumidifierCard } from '@navet/app/features/climate/components/humidifier-card';
import { HVACCard } from '@navet/app/features/climate/components/hvac-card';
import { type CustomCard, DashboardLayout, WidgetCard } from '@navet/app/features/dashboard';
import { EnergyDashboardPage } from '@navet/app/features/energy/components/dashboard/energy-dashboard-page';
import { EnergyNowCardView } from '@navet/app/features/energy/components/widgets/energy-now-card-view';
import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import { FanCard } from '@navet/app/features/lighting/components/fan-card';
import { LightCard } from '@navet/app/features/lighting/components/light-card';
import { SwitchCard } from '@navet/app/features/lighting/components/switch-card';
import { MediaCard } from '@navet/app/features/media/components/media-card';
import { PersonCard } from '@navet/app/features/person/components/person-card';
import { SceneCard } from '@navet/app/features/scenes/components/scene-card';
import { AlarmPanelCard } from '@navet/app/features/security/components/alarm-panel-card';
import { CameraCard } from '@navet/app/features/security/components/camera-card';
import { CoverCard } from '@navet/app/features/security/components/cover-card';
import { LockCard } from '@navet/app/features/security/components/lock-card';
import { SecurityCameraDashboard } from '@navet/app/features/security/components/security-camera-dashboard';
import { buildSecurityCameraDashboardModel } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import { InfoBadgeStrip } from '@navet/app/features/sensors';
import { GroupedSensorCard } from '@navet/app/features/sensors/components/grouped-sensor-card';
import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import { SensorCard } from '@navet/app/features/sensors/components/sensor-card';
import { SettingsSection } from '@navet/app/features/settings/components/settings-section';
import { VacuumCard } from '@navet/app/features/vacuum/components/vacuum-card';
import { WeatherCard } from '@navet/app/features/weather/components/weather-card';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { I18nProvider } from '@navet/app/i18n';
import type { Section } from '@navet/app/navigation/sections';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { defaultSettings, useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import type { HassConfig, HassEntities } from 'home-assistant-js-websocket';
import {
  Bot,
  ClipboardList,
  Clock3,
  Fan,
  Lightbulb,
  Play,
  ShieldCheck,
  Speaker,
  Zap,
} from 'lucide-react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { CameraDevice, LockDevice, SensorDevice } from '../types/device.types';
import { PHOTO_FRAME_DEMO_IMAGES } from './photo-frame-demo-images';

type DemoSection = Section;

const noopCardSizeChange = () => {};
const DEMO_ROOMS = [
  'Basement',
  'Bathroom',
  'Bedroom',
  'Guest room',
  'Gym',
  'Hallway',
  'Kitchen',
  'Living Room',
  'Office',
  'Outside',
  'Toilet',
  'Unassigned',
];

const energyTrend = [
  ['00:00', 420],
  ['03:00', 360],
  ['06:00', 510],
  ['09:00', 840],
  ['12:00', 690],
  ['15:00', 760],
  ['18:00', 1180],
  ['21:00', 620],
].map(([label, value], index) => ({
  label: String(label),
  value: Number(value),
  timestampMs: Date.UTC(2026, 4, 16, index * 3),
}));

const demoEnergyScenario = getEnergyDashboardScenario('default');
const demoEnergySourceDiagnostics = getMockEnergySourceDiagnostics(demoEnergyScenario.dashboard);
const { artwork: sampleArtworkImage } = RUNTIME_SAMPLE_MEDIA;
const sampleCameraFallbackImage = cameraSampleImageWebp;
const sampleCameraSources = [
  { srcSet: cameraSampleImageAvif, type: 'image/avif' },
  { srcSet: cameraSampleImageWebp, type: 'image/webp' },
] as const;
const {
  energyTablet: demoEnergyImage,
  homePhone: demoMobileImage,
  homeTablet: demoHomeImage,
  securityTablet: demoSecurityImage,
} = RUNTIME_SAMPLE_SCREENSHOTS;

const demoHomeAssistantConfig = {
  latitude: 55.8708,
  longitude: 12.8302,
  elevation: 10,
  radius: 100,
  unit_system: {
    length: 'km',
    accumulated_precipitation: 'mm',
    mass: 'kg',
    pressure: 'hPa',
    temperature: 'C',
    volume: 'L',
    wind_speed: 'm/s',
  },
  location_name: 'Navet Demo',
  time_zone: 'Europe/Stockholm',
  components: [],
  config_dir: '',
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  version: 'demo',
  config_source: 'storage',
  recovery_mode: false,
  safe_mode: false,
  state: 'RUNNING',
  external_url: null,
  internal_url: null,
  currency: 'SEK',
  country: 'SE',
  language: 'en',
} satisfies HassConfig;

const demoEntityTimestamp = '2026-05-16T08:00:00+00:00';

function createDemoLightEntity({
  entityId,
  friendlyName,
  state = 'on',
  brightness,
  colorTempKelvin,
}: {
  entityId: string;
  friendlyName: string;
  state?: 'on' | 'off';
  brightness: number;
  colorTempKelvin?: number;
}) {
  return {
    entity_id: entityId,
    state,
    attributes: {
      friendly_name: friendlyName,
      brightness: Math.round((Math.max(0, Math.min(100, brightness)) / 100) * 255),
      supported_color_modes:
        typeof colorTempKelvin === 'number' ? ['brightness', 'color_temp'] : ['brightness'],
      ...(typeof colorTempKelvin === 'number'
        ? {
            color_mode: 'color_temp',
            color_temp_kelvin: colorTempKelvin,
            min_color_temp_kelvin: 2700,
            max_color_temp_kelvin: 6500,
          }
        : {}),
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: `demo-${entityId}`, parent_id: null, user_id: null },
  };
}

const demoLightEntities: HassEntities = {
  'light.kitchen_island': createDemoLightEntity({
    entityId: 'light.kitchen_island',
    friendlyName: 'Kitchen island',
    brightness: 72,
    colorTempKelvin: 3600,
  }),
  'light.living_room': createDemoLightEntity({
    entityId: 'light.living_room',
    friendlyName: 'Living Room',
    brightness: 68,
    colorTempKelvin: 3200,
  }),
  'light.kitchen': createDemoLightEntity({
    entityId: 'light.kitchen',
    friendlyName: 'Kitchen',
    brightness: 84,
    colorTempKelvin: 4100,
  }),
  'light.bedroom': createDemoLightEntity({
    entityId: 'light.bedroom',
    friendlyName: 'Bedroom',
    state: 'off',
    brightness: 35,
    colorTempKelvin: 2700,
  }),
  'light.hallway': createDemoLightEntity({
    entityId: 'light.hallway',
    friendlyName: 'Hallway',
    brightness: 42,
    colorTempKelvin: 3000,
  }),
  'light.kitchen_island_room': createDemoLightEntity({
    entityId: 'light.kitchen_island_room',
    friendlyName: 'Kitchen island',
    brightness: 72,
    colorTempKelvin: 3600,
  }),
  'light.sofa_lamp': createDemoLightEntity({
    entityId: 'light.sofa_lamp',
    friendlyName: 'Sofa lamp',
    brightness: 58,
    colorTempKelvin: 2900,
  }),
  'light.basement_main': createDemoLightEntity({
    entityId: 'light.basement_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.bathroom_main': createDemoLightEntity({
    entityId: 'light.bathroom_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.guest_room': createDemoLightEntity({
    entityId: 'light.guest_room',
    friendlyName: 'Bedside lamp',
    state: 'off',
    brightness: 35,
    colorTempKelvin: 2700,
  }),
  'light.gym_main': createDemoLightEntity({
    entityId: 'light.gym_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.office_main': createDemoLightEntity({
    entityId: 'light.office_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.outside_main': createDemoLightEntity({
    entityId: 'light.outside_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.toilet_main': createDemoLightEntity({
    entityId: 'light.toilet_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
  'light.unassigned_main': createDemoLightEntity({
    entityId: 'light.unassigned_main',
    friendlyName: 'Main light',
    brightness: 52,
    colorTempKelvin: 3200,
  }),
};

const demoHomeAssistantEntities: HassEntities = {
  ...demoLightEntities,
  'sensor.front_door_sensor_battery': {
    entity_id: 'sensor.front_door_sensor_battery',
    state: '18',
    attributes: {
      friendly_name: 'Front Door Sensor',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-battery-1', parent_id: null, user_id: null },
  },
  'sensor.kitchen_remote_battery': {
    entity_id: 'sensor.kitchen_remote_battery',
    state: '42',
    attributes: {
      friendly_name: 'Kitchen Remote',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-battery-2', parent_id: null, user_id: null },
  },
  'sensor.living_room_motion_battery': {
    entity_id: 'sensor.living_room_motion_battery',
    state: '67',
    attributes: {
      friendly_name: 'Living Room Motion',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-battery-3', parent_id: null, user_id: null },
  },
  'sensor.living_room_temp': {
    entity_id: 'sensor.living_room_temp',
    state: '22.4',
    attributes: {
      friendly_name: 'Living Room Temperature',
      device_class: 'temperature',
      unit_of_measurement: 'C',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-sensor-1', parent_id: null, user_id: null },
  },
  'sensor.living_room_humidity': {
    entity_id: 'sensor.living_room_humidity',
    state: '47',
    attributes: {
      friendly_name: 'Living Room Humidity',
      device_class: 'humidity',
      unit_of_measurement: '%',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-sensor-2', parent_id: null, user_id: null },
  },
  'sensor.living_room_co2': {
    entity_id: 'sensor.living_room_co2',
    state: '510',
    attributes: {
      friendly_name: 'Living Room CO2',
      device_class: 'carbon_dioxide',
      unit_of_measurement: 'ppm',
    },
    last_changed: demoEntityTimestamp,
    last_updated: demoEntityTimestamp,
    context: { id: 'demo-sensor-3', parent_id: null, user_id: null },
  },
};

const demoSummaryItems: HomeStatusSummaryItem[] = [
  {
    id: 'energy',
    title: 'Energy',
    value: '1.4 kW',
    icon: Zap,
    iconColor: '#f59e0b',
    targetSection: 'energy',
  },
  {
    id: 'climate',
    title: 'Climate',
    value: '21,0-25,4°',
    icon: Fan,
    iconColor: '#22d3ee',
    targetSection: 'climate',
  },
  {
    id: 'security',
    title: 'Security',
    value: 'No Alerts',
    icon: ShieldCheck,
    iconColor: '#22c55e',
    targetSection: 'security',
  },
  {
    id: 'lights',
    title: 'Lights',
    value: '0 On',
    icon: Lightbulb,
    iconColor: '#facc15',
    targetSection: 'lights',
  },
  {
    id: 'media',
    title: 'Speakers & TVs',
    value: 'None Playing',
    icon: Speaker,
    iconColor: '#cbd5e1',
    targetSection: 'media',
  },
];

const demoAlarmEntities: NavetAlarmEntity[] = [
  {
    id: 'home_assistant:alarm_control_panel.home',
    name: 'Home Alarm',
    state: 'armed_home',
    supportedActions: ['arm_home', 'arm_away', 'arm_night', 'disarm'],
    codeFormat: 'number',
    requiresCode: true,
    provider: 'home_assistant',
    availability: 'available',
  },
];

const demoSecurityCameras: CameraDevice[] = [
  {
    id: 'camera.front_door',
    name: 'Front Door',
    room: 'Entrance',
    entityPicture: sampleCameraFallbackImage,
    entityPictureSources: sampleCameraSources,
    size: 'medium',
    state: 'streaming',
    supportedFeatures: 0,
    isStreamCapable: false,
    isStillImageOnly: true,
    lastChanged: demoEntityTimestamp,
    lastUpdated: demoEntityTimestamp,
  },
  {
    id: 'camera.driveway',
    name: 'Driveway',
    room: 'Garage',
    entityPicture: sampleCameraFallbackImage,
    entityPictureSources: sampleCameraSources,
    size: 'medium',
    state: 'idle',
    supportedFeatures: 0,
    isStreamCapable: false,
    isStillImageOnly: true,
    lastChanged: demoEntityTimestamp,
    lastUpdated: demoEntityTimestamp,
  },
  {
    id: 'camera.garden',
    name: 'Garden',
    room: 'Garden',
    entityPicture: sampleCameraFallbackImage,
    entityPictureSources: sampleCameraSources,
    size: 'medium',
    state: 'recording',
    supportedFeatures: 0,
    isStreamCapable: false,
    isStillImageOnly: true,
    lastChanged: demoEntityTimestamp,
    lastUpdated: demoEntityTimestamp,
  },
  {
    id: 'camera.utility_map',
    name: 'Utility Map',
    room: 'Utility',
    entityPicture: sampleCameraFallbackImage,
    entityPictureSources: sampleCameraSources,
    size: 'medium',
    state: '2026-05-16 20:17:10',
    supportedFeatures: 0,
    isStreamCapable: false,
    isStillImageOnly: true,
    lastChanged: demoEntityTimestamp,
    lastUpdated: demoEntityTimestamp,
  },
  {
    id: 'camera.side_gate',
    name: 'Side Gate',
    room: 'Garden',
    entityPicture: sampleCameraFallbackImage,
    entityPictureSources: sampleCameraSources,
    size: 'medium',
    state: 'unavailable',
    securityKind: 'camera',
    securitySeverity: 'unknown',
    supportedFeatures: 0,
    isStreamCapable: false,
    isStillImageOnly: true,
    lastChanged: demoEntityTimestamp,
    lastUpdated: demoEntityTimestamp,
  },
];

const demoSecurityLocks: LockDevice[] = [
  {
    id: 'lock.front_door',
    name: 'Front Door',
    room: 'Entrance',
    size: 'small',
    state: true,
    securityKind: 'lock',
    securitySeverity: 'normal',
  },
  {
    id: 'lock.back_door',
    name: 'Back Door',
    room: 'Kitchen',
    size: 'small',
    state: false,
    securityKind: 'lock',
    securitySeverity: 'warning',
  },
];

const demoSecuritySensors: SensorDevice[] = [
  {
    id: 'binary_sensor.entry_motion',
    nativeId: 'binary_sensor.entry_motion',
    name: 'Entry Motion',
    room: 'Entrance',
    size: 'small',
    value: 'on',
    unit: '',
    deviceClass: 'motion',
    securityKind: 'motion',
    securitySeverity: 'active',
    status: 'active',
  },
  {
    id: 'binary_sensor.patio_door',
    nativeId: 'binary_sensor.patio_door',
    name: 'Patio Door',
    room: 'Garden',
    size: 'small',
    value: 'on',
    unit: '',
    deviceClass: 'door',
    securityKind: 'door',
    securitySeverity: 'warning',
    status: 'active',
  },
];

const demoAutomations = [
  {
    id: 'automation.good_morning',
    name: 'Good morning',
    room: 'Home',
    enabled: true,
    description: 'Raises bedroom lights, starts the kitchen speaker, and sets downstairs heat.',
    lastTriggered: 'Today, 06:45',
    mode: 'single',
  },
  {
    id: 'automation.night_check',
    name: 'Night check',
    room: 'Security',
    enabled: true,
    description: 'Locks doors, arms home mode, and turns off common-area lights after 22:30.',
    lastTriggered: 'Yesterday, 22:32',
    mode: 'queued',
  },
  {
    id: 'automation.away_presence',
    name: 'Away presence',
    room: 'Outside',
    enabled: false,
    description: 'Runs presence lighting and camera notifications when nobody is home.',
    lastTriggered: 'Fri, 18:10',
    mode: 'restart',
  },
] satisfies Array<{
  id: string;
  name: string;
  room: string;
  enabled: boolean;
  description: string;
  lastTriggered: string;
  mode: string;
}>;

const forecast = [
  { day: 'Mon', condition: 'sunny', high: 22, low: 13 },
  { day: 'Tue', condition: 'partlycloudy', high: 19, low: 12 },
  { day: 'Wed', condition: 'rainy', high: 16, low: 10 },
  { day: 'Thu', condition: 'sunny', high: 21, low: 12 },
  { day: 'Fri', condition: 'cloudy', high: 18, low: 11 },
  { day: 'Sat', condition: 'sunny', high: 20, low: 12 },
  { day: 'Sun', condition: 'partlycloudy', high: 17, low: 10 },
];

const calendarEvents = [
  {
    id: 'demo-calendar-1',
    title: 'School pickup',
    startTime: '15:00',
    endTime: '15:30',
    timeDisplay: '15:00',
    startDateTime: '2026-05-16T15:00:00.000Z',
    endDateTime: '2026-05-16T15:30:00.000Z',
    type: 'event' as const,
    color: 'bg-blue-500',
    location: 'North entrance',
    sortKey: '2026-05-16T15:00:00.000Z',
  },
  {
    id: 'demo-calendar-2',
    title: 'Installer call',
    startTime: '17:30',
    endTime: '18:00',
    timeDisplay: '17:30',
    startDateTime: '2026-05-17T17:30:00.000Z',
    endDateTime: '2026-05-17T18:00:00.000Z',
    type: 'call' as const,
    color: 'bg-purple-500',
    attendees: 2,
    sortKey: '2026-05-17T17:30:00.000Z',
  },
  {
    id: 'demo-calendar-3',
    title: 'Waste pickup',
    startTime: 'All day',
    endTime: 'All day',
    timeDisplay: 'All day',
    startDateTime: '2026-05-18T00:00:00.000Z',
    isAllDay: true,
    type: 'event' as const,
    color: 'bg-green-500',
    location: 'Home',
    sortKey: '2026-05-18T00:00:00.000Z',
  },
];

const demoHomeWidgets: CustomCard[] = [
  {
    id: 'demo-widget-note',
    type: 'note',
    size: 'medium',
    room: 'Home',
    createdAt: 1,
    data: {
      note: 'Tonight: arm home mode, dim hallway, and start the vacuum after dinner.',
      tintColor: '#f97316',
    },
  },
  {
    id: 'demo-widget-photo',
    type: 'photo',
    size: 'medium',
    room: 'Home',
    createdAt: 2,
    data: {
      sourceMode: 'urls',
      photoImages: PHOTO_FRAME_DEMO_IMAGES,
      shuffleEnabled: false,
    },
  },
  {
    id: 'demo-widget-rss',
    type: 'rss',
    size: 'large',
    room: 'Home',
    createdAt: 3,
    data: {
      articleCount: 4,
      customProviders: [
        {
          id: 'bbc-world',
          name: 'BBC World',
          type: 'url',
          feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
          demoItems: [
            {
              id: 'demo-rss-1',
              title: 'Energy dashboard highlights evening demand peak',
              source: 'BBC World',
              timeAgo: '12 min ago',
              url: 'https://www.bbc.com/news',
              excerpt:
                'A practical view of home energy demand helps households shift flexible loads away from the evening peak.',
              imageUrl: demoEnergyImage,
              publishedAtMs: Date.UTC(2026, 4, 16, 18, 40),
            },
            {
              id: 'demo-rss-2',
              title: 'Smart home controls move toward calmer shared screens',
              source: 'BBC World',
              timeAgo: '28 min ago',
              url: 'https://www.bbc.com/news',
              excerpt:
                'Dashboard-first interfaces are focusing on clarity, glanceability, and fewer interruptions for family spaces.',
              imageUrl: demoHomeImage,
              publishedAtMs: Date.UTC(2026, 4, 16, 18, 24),
            },
            {
              id: 'demo-rss-3',
              title: 'Weather systems bring cooler nights across southern Sweden',
              source: 'BBC World',
              timeAgo: '46 min ago',
              url: 'https://www.bbc.com/weather',
              excerpt:
                'Forecasts show mild daytime conditions with cooler nights and a chance of showers later in the week.',
              imageUrl: demoMobileImage,
              publishedAtMs: Date.UTC(2026, 4, 16, 18, 6),
            },
            {
              id: 'demo-rss-4',
              title: 'Connected devices get renewed focus on local-first privacy',
              source: 'BBC World',
              timeAgo: '1 hr ago',
              url: 'https://www.bbc.com/news/technology',
              excerpt:
                'More smart home products are adding local controls and clearer data boundaries for household automation.',
              imageUrl: demoSecurityImage,
              publishedAtMs: Date.UTC(2026, 4, 16, 17, 40),
            },
          ],
        },
      ],
      selectedProviderIds: ['bbc-world'],
    },
  },
  {
    id: 'demo-widget-map',
    type: 'map',
    size: 'medium',
    room: 'Home',
    createdAt: 4,
    data: {
      markers: [
        {
          id: 'person.demo_landskrona',
          name: 'Landskrona',
          latitude: 55.8708,
          longitude: 12.8302,
          state: 'home',
          gpsAccuracy: 24,
        },
      ],
    },
  },
  {
    id: 'demo-widget-battery',
    type: 'battery',
    size: 'medium',
    room: 'Home',
    createdAt: 5,
    data: {
      selectedEntityIds: [
        'sensor.front_door_sensor_battery',
        'sensor.kitchen_remote_battery',
        'sensor.living_room_motion_battery',
      ],
    },
  },
  {
    id: 'demo-widget-button',
    type: 'button',
    size: 'small',
    room: 'Home',
    createdAt: 6,
    data: {
      label: 'Movie Mode',
      service: 'scene.turn_on',
      entityId: 'scene.movie_mode',
      icon: 'Zap',
      tintColor: '#60a5fa',
    },
  },
  {
    id: 'demo-widget-sensor-group',
    type: 'info',
    size: 'medium',
    room: 'Home',
    createdAt: 7,
    data: {
      name: 'Living Room Air',
      sensorEntityIds: [
        'sensor.living_room_temp',
        'sensor.living_room_humidity',
        'sensor.living_room_co2',
      ],
      accentColor: 'teal',
    },
  },
];

const groupedSensors = [
  {
    id: 'sensor.living_room_temp',
    label: 'Temp',
    value: '22.4',
    unit: 'C',
    icon: 'thermometer' as const,
  },
  {
    id: 'sensor.living_room_humidity',
    label: 'Humidity',
    value: '47',
    unit: '%',
    icon: 'droplets' as const,
  },
  { id: 'sensor.living_room_co2', label: 'CO2', value: '510', unit: 'ppm', icon: 'gauge' as const },
  {
    id: 'sensor.living_room_pm25',
    label: 'PM2.5',
    value: '8',
    unit: 'ug/m3',
    icon: 'activity' as const,
  },
];

function useDemoDisplayDefaults() {
  useEffect(() => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setPrimaryColor('orange');
    useThemeStore.getState().setCustomPrimaryColor(null);
    useThemeStore.getState().setWallpaper(null);
    useSettingsStore.getState().updateSettings({
      ...defaultSettings,
      username: 'Navet',
      language: 'en',
      temperatureUnit: 'celsius',
      cameraDashboardViewMode: 'snapshot',
      effectsQuality: 'high',
      disableAnimations: false,
      lowPowerMode: false,
    });

    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.navetPreviewRuntime = 'demo';
    document.documentElement.style.setProperty('--navet-accent', '#f97316');
    document.documentElement.dataset.effectsQuality = 'high';
    document.documentElement.dataset.lowPower = 'false';
    document.documentElement.dataset.noAnimation = 'false';
    homeAssistantStore.getState().syncPanelHass({
      states: demoHomeAssistantEntities,
      config: demoHomeAssistantConfig,
      callService: async () => undefined,
      callWS: async <T,>() => [] as T,
    });
  }, []);
}

function CardSlot({ size, children }: { size: CardSize; children: ReactNode }) {
  const breakpointCols = useBreakpointCols();
  const { heightPx } = getDashboardCardFootprint(size, breakpointCols);

  return (
    <div
      className={`${getCardSpanClass(size)} min-w-0 [&>*]:h-full`}
      style={{ minHeight: heightPx }}
    >
      {children}
    </div>
  );
}

function SectionBlock({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section className="space-y-3">
      <div>
        {eyebrow ? (
          <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}>
            {eyebrow}
          </div>
        ) : null}
        <h2
          className={`${eyebrow ? 'mt-1' : ''} text-lg font-semibold tracking-tight ${surface.textPrimary}`}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function getRoomEntitySlug(room: string) {
  return room.toLowerCase().replace(/\s+/g, '_');
}

function DashboardGrid({ children }: { children: ReactNode }) {
  const breakpointCols = useBreakpointCols();

  return (
    <div
      className="grid w-full grid-flow-row-dense gap-3 md:gap-3 lg:gap-4"
      style={
        {
          ...getCardGridAutoRowsStyle(breakpointCols),
          gridTemplateColumns: `repeat(${getDashboardGridColumnCount(breakpointCols)}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

function DemoSummaryRow() {
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);

  return <InfoBadgeStrip items={demoSummaryItems} onNavigate={setActiveSection} />;
}

function ProductGrid() {
  return (
    <div className="space-y-4 md:space-y-5">
      <DemoSummaryRow />
      <DashboardGrid>
        <CardSlot size="small">
          <LightCard
            id="light.kitchen_island"
            name="Kitchen island"
            room="Kitchen"
            initialState
            initialBrightness={72}
            initialTemp={3600}
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <FanCard
            id="fan.bedroom_ceiling"
            name="Bedroom fan"
            room="Bedroom"
            initialState
            initialPercentage={66}
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <HVACCard
            id="climate.main_floor"
            name="Main floor"
            room="Hallway"
            initialTemp={22}
            initialCurrentTemp={21}
            initialMode="heat"
            initialAction="heating"
            initialState
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <HumidifierCard
            id="humidifier.bedroom"
            name="Bedroom Humidifier"
            room="Bedroom"
            entityType="Humidifier"
            deviceClass="humidifier"
            initialState
            initialTargetHumidity={46}
            minHumidity={30}
            maxHumidity={70}
            targetHumidityStep={1}
            initialMode="auto"
            availableModes={['auto', 'eco', 'sleep']}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <MediaCard
            id="media_player.living_room_speaker"
            name="Living Room Speaker"
            room="Living Room"
            title="Morning Mix"
            artist="Navet Radio"
            entityType="Speaker"
            entityPicture={sampleArtworkImage}
            state="playing"
            volume={42}
            isMuted={false}
            elapsedSeconds={86}
            durationSeconds={243}
            positionUpdatedAt={new Date('2026-05-16T12:00:00.000Z').toISOString()}
            supportsGrouping
            groupMembers={['Kitchen Speaker']}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <MediaCard
            id="media_player.living_room_tv"
            name="Living Room TV"
            room="Living Room"
            title="Aerial"
            artist="Navet Studio"
            entityType="TV"
            deviceClass="tv"
            source="Samsung TV Plus"
            sourceList={['Samsung TV Plus', 'HDMI 1', 'HDMI 2', 'Apple TV']}
            state="idle"
            volume={36}
            isMuted={false}
            supportsGrouping={false}
            groupMembers={[]}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
            simulateTvRemote
          />
        </CardSlot>
        <CardSlot size="small">
          <CoverCard
            id="cover.living_room_blinds"
            name="Living Room Blinds"
            room="Living Room"
            initialPosition={48}
            initialDeviceClass="blind"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <LockCard id="lock.front_door" name="Front Door" initialState size="small" />
        </CardSlot>
        <CardSlot size="medium">
          <AlarmPanelCard alarms={demoAlarmEntities} size="medium" />
        </CardSlot>
        <CardSlot size="small">
          <PersonCard
            id="person.demo_alex"
            name="Alex"
            room="Home"
            location="Landskrona"
            state="home"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="large">
          <WeatherCard
            id="weather.home"
            location="Stockholm"
            temperature={18}
            feelsLikeTemperature={17}
            condition="partlycloudy"
            humidity={58}
            windSpeed={12}
            precipitation={0.4}
            precipitationUnit="mm"
            sunrise="05:08"
            sunset="20:51"
            daylight="15h 43m"
            rainForecast="Light rain possible later"
            forecast={forecast}
            forecastMode="weekly"
            highTemp={22}
            lowTemp={13}
            size="large"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="large">
          <CalendarCard
            id="calendar.home"
            name="Family Calendar"
            room="Home"
            events={calendarEvents}
            inEditMode={false}
            size="large"
            onSizeChange={noopCardSizeChange}
          />
        </CardSlot>
        <CardSlot size="medium">
          <EnergyNowCardView
            title="Energy now"
            currentLoadW={842}
            todayUsageKWh={12.4}
            trend={energyTrend}
            accentColor="#f97316"
            size="medium"
          />
        </CardSlot>
        <CardSlot size="small">
          <SwitchCard
            id="switch.desk_power"
            name="Desk power"
            initialState
            size="small"
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <SwitchCard
            id="script.goodnight"
            name="Goodnight"
            initialState={false}
            entityType="script"
            serviceDomain="script"
            serviceAction="turn_on"
            size="small"
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <SceneCard
            id="scene.movie_mode"
            name="Movie Mode"
            room="Living Room"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <SensorCard
            id="sensor.entry_temperature"
            name="Entry temperature"
            room="Hallway"
            value="21.6"
            unit="C"
            icon="thermometer"
            subtitle="Sensor"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <VacuumCard
            id="vacuum.downstairs"
            name="Downstairs Vacuum"
            status="docked"
            battery={92}
            cleanedArea="48 m²"
            cleaningTime="42 min"
            nextCleaning="Tomorrow"
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        {demoHomeWidgets.map((card) => (
          <DemoWidgetCard key={card.id} card={card} />
        ))}
      </DashboardGrid>
    </div>
  );
}

function DemoWidgetCard({ card }: { card: CustomCard }) {
  return (
    <CardSlot size={card.size}>
      <WidgetCard card={card} isEditMode={false} onUpdate={() => undefined} />
    </CardSlot>
  );
}

function EnergyShot() {
  return (
    <EnergyDashboardPage
      dashboard={demoEnergyScenario.dashboard}
      sourceDiagnostics={demoEnergySourceDiagnostics}
    />
  );
}

function ClimateShot() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <SectionBlock title={t('sections.climate.hvac.title')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <HVACCard
              id="climate.main_floor_section"
              name="Main Floor"
              room="Hallway"
              initialTemp={22}
              initialCurrentTemp={21}
              initialMode="heat"
              initialAction="heating"
              initialState
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>

      <SectionBlock title={t('sections.climate.fans.title')}>
        <DashboardGrid>
          <CardSlot size="small">
            <FanCard
              id="fan.bedroom_ceiling_section"
              name="Bedroom Fan"
              room="Bedroom"
              initialState
              initialPercentage={54}
              size="small"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>

      <SectionBlock title={t('sections.climate.humidity.title')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <HumidifierCard
              id="humidifier.bedroom_section"
              name="Bedroom Humidifier"
              room="Bedroom"
              entityType="Humidifier"
              deviceClass="humidifier"
              initialState
              initialTargetHumidity={46}
              minHumidity={30}
              maxHumidity={70}
              targetHumidityStep={1}
              initialMode="auto"
              availableModes={['auto', 'eco', 'sleep']}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>

      <SectionBlock title={t('sections.climate.airQuality.title')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <GroupedSensorCard
              id="grouped_sensors.climate_air"
              name="Indoor Air"
              room="Home"
              sensors={groupedSensors}
              accentColor="teal"
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>
    </div>
  );
}

function SecurityShot() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const model = buildSecurityCameraDashboardModel({
    cameras: demoSecurityCameras,
    locks: demoSecurityLocks,
    sensors: demoSecuritySensors,
  });

  return (
    <SecurityCameraDashboard
      model={model}
      isEditMode={false}
      alarms={demoAlarmEntities}
      cardSizes={{}}
      updateCardSize={noopCardSizeChange}
      surface={surface}
    />
  );
}

function LightsShot() {
  return (
    <div className="space-y-6">
      <SectionBlock title="Common areas">
        <DashboardGrid>
          <CardSlot size="medium">
            <LightCard
              id="light.living_room"
              name="Living Room"
              room="Living Room"
              initialState
              initialBrightness={68}
              initialTemp={3200}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
          <CardSlot size="medium">
            <LightCard
              id="light.kitchen"
              name="Kitchen"
              room="Kitchen"
              initialState
              initialBrightness={84}
              initialTemp={4100}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
          <CardSlot size="small">
            <SwitchCard
              id="switch.patio_lights"
              name="Patio lights"
              initialState
              size="small"
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>
      <SectionBlock title="Evening lighting">
        <DashboardGrid>
          <CardSlot size="small">
            <LightCard
              id="light.bedroom"
              name="Bedroom"
              room="Bedroom"
              initialState={false}
              initialBrightness={35}
              initialTemp={2700}
              size="small"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
          <CardSlot size="small">
            <LightCard
              id="light.hallway"
              name="Hallway"
              room="Hallway"
              initialState
              initialBrightness={42}
              initialTemp={3000}
              size="small"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>
    </div>
  );
}

function SettingsShot() {
  return <SettingsSection hiddenTabs={['system']} />;
}

function MediaShot() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <SectionBlock title={t('sections.media.tv.title')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <MediaCard
              id="media_player.living_room_tv"
              name="Living Room TV"
              room="Living Room"
              title="Aerial"
              artist="Apple TV"
              entityType="TV"
              deviceClass="tv"
              source="Apple TV"
              sourceList={['Apple TV', 'HDMI 1', 'Chromecast', 'PlayStation 5']}
              state="playing"
              volume={42}
              isMuted={false}
              elapsedSeconds={86}
              durationSeconds={243}
              positionUpdatedAt={new Date('2026-05-16T12:00:00.000Z').toISOString()}
              supportsGrouping
              groupMembers={['Kitchen Speaker']}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
              simulateTvRemote
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>

      <SectionBlock title={t('sections.media.audio.title')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <MediaCard
              id="media_player.kitchen_speaker"
              name="Kitchen Speaker"
              room="Kitchen"
              title="Morning Mix"
              artist="Navet Radio"
              entityType="Speaker"
              source="Spotify"
              sourceList={['Spotify', 'AirPlay', 'Radio']}
              state="playing"
              volume={34}
              isMuted={false}
              elapsedSeconds={104}
              durationSeconds={218}
              positionUpdatedAt={new Date('2026-05-16T12:00:00.000Z').toISOString()}
              supportsGrouping
              groupMembers={['Living Room TV', 'Bedroom Speaker']}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
          <CardSlot size="medium">
            <MediaCard
              id="media_player.bedroom_speaker"
              name="Bedroom Speaker"
              room="Bedroom"
              title="Deep Focus"
              artist="Navet Radio"
              entityType="Speaker"
              source="AirPlay"
              sourceList={['Spotify', 'AirPlay', 'Radio']}
              state="paused"
              volume={18}
              isMuted={false}
              elapsedSeconds={42}
              durationSeconds={195}
              positionUpdatedAt={new Date('2026-05-16T12:00:00.000Z').toISOString()}
              supportsGrouping
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>

      <SectionBlock title={t('media.type.streamingBox')}>
        <DashboardGrid>
          <CardSlot size="medium">
            <MediaCard
              id="media_player.office_display"
              name="Office Display"
              room="Office"
              title="Standby"
              artist="Google Cast"
              entityType="Streaming Box"
              source="Chromecast"
              sourceList={['Chromecast', 'YouTube', 'Spotify']}
              state="idle"
              volume={24}
              isMuted={false}
              size="medium"
              onSizeChange={noopCardSizeChange}
              isEditMode={false}
            />
          </CardSlot>
        </DashboardGrid>
      </SectionBlock>
    </div>
  );
}

function TasksShot() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const activeAutomationCount = demoAutomations.filter((automation) => automation.enabled).length;
  const disabledAutomationCount = demoAutomations.length - activeAutomationCount;

  if (demoAutomations.length === 0) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center p-6">
        <DashboardEmptyState
          icon={ClipboardList}
          title="No automations yet"
          description="Connect Home Assistant automations to show routines, recent runs, and quick controls here."
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-4 md:space-y-5">
      <DashboardHeroSection
        accentColor={accentColor}
        surface={surface}
        title="Automations"
        description="Demo routines mirror the automation dashboard layout with active state, recent runs, and run controls."
        actionsClassName="hidden md:flex"
        actions={
          <>
            <AutomationHeroBadge icon={Bot}>
              {demoAutomations.length} automations
            </AutomationHeroBadge>
            <AutomationHeroBadge icon={Zap} active>
              {activeAutomationCount} active
            </AutomationHeroBadge>
            <AutomationHeroBadge icon={ClipboardList}>
              {disabledAutomationCount} disabled
            </AutomationHeroBadge>
          </>
        }
        aside={
          <Panel muted padded={false} className="p-4">
            <div className="flex items-start gap-3">
              <Clock3 className={`mt-0.5 h-4 w-4 ${surface.textSecondary}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase ${surface.textMuted}`}>Latest run</p>
                <p className={`mt-1 truncate text-sm font-semibold ${surface.textPrimary}`}>
                  {demoAutomations[0].name}
                </p>
                <p className={`mt-1 text-sm ${surface.textSecondary}`}>
                  {demoAutomations[0].lastTriggered}
                </p>
              </div>
            </div>
          </Panel>
        }
      />

      <SectionCard
        title="Automations"
        description="Fake demo routines for the dashboard preview."
        action={<Badge tone="accent">{demoAutomations.length} automations</Badge>}
        contentClassName="px-4 py-5 md:px-8 md:py-8"
        padding="none"
      >
        <div className="space-y-3">
          {demoAutomations.map((automation) => (
            <Panel key={automation.id} as="article" muted padded={false} className="p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`truncate text-base font-semibold ${surface.textPrimary}`}>
                      {automation.name}
                    </h3>
                    <Badge tone={automation.enabled ? 'accent' : 'neutral'}>
                      {automation.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className={`mt-2 line-clamp-2 text-sm leading-6 ${surface.textSecondary}`}>
                    {automation.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>{automation.room}</Tag>
                    <Tag>Last run {automation.lastTriggered}</Tag>
                    <Tag>{automation.mode}</Tag>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                  <Switch checked={automation.enabled} aria-label={`${automation.name} enabled`} />
                  <Button
                    variant="secondary"
                    size="small"
                    leading={<Play className="h-4 w-4" aria-hidden="true" />}
                    className="min-w-24 flex-1 sm:flex-none"
                  >
                    Run
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AutomationHeroBadge({
  active = false,
  children,
  icon: Icon,
}: {
  active?: boolean;
  children: ReactNode;
  icon: ComponentType<{ className?: string; color?: string }>;
}) {
  const { accentColor } = useTheme();

  return (
    <span
      className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold leading-none"
      style={{
        backgroundColor: active ? `${accentColor}12` : 'rgba(255,255,255,0.04)',
        borderColor: active ? `${accentColor}48` : 'rgba(255,255,255,0.1)',
        color: active ? '#ffffff' : undefined,
      }}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${active ? '' : 'text-current'}`}
        {...(active ? { color: accentColor } : {})}
      />
      {children}
    </span>
  );
}

function HomeRoomShot({ activeRoom }: { activeRoom: string }) {
  if (!isAllRooms(activeRoom)) {
    return <RoomShot room={activeRoom} />;
  }

  return (
    <div className="space-y-6">
      <ProductGrid />
    </div>
  );
}

function RoomShot({ room }: { room: string }) {
  const roomSlug = getRoomEntitySlug(room);

  if (room === 'Kitchen') {
    return (
      <DashboardGrid>
        <CardSlot size="medium">
          <LightCard
            id="light.kitchen"
            name="Kitchen"
            room="Kitchen"
            initialState
            initialBrightness={84}
            initialTemp={4100}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <LightCard
            id="light.kitchen_island_room"
            name="Kitchen island"
            room="Kitchen"
            initialState
            initialBrightness={72}
            initialTemp={3600}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <SwitchCard
            id="switch.espresso"
            name="Espresso"
            initialState
            entityType="switch"
            serviceDomain="switch"
            serviceAction="toggle"
            power={1140}
            size="small"
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <CalendarCard
            id="calendar.kitchen"
            name="Family Calendar"
            room="Kitchen"
            events={calendarEvents}
            inEditMode={false}
            size="medium"
            onSizeChange={noopCardSizeChange}
          />
        </CardSlot>
      </DashboardGrid>
    );
  }

  if (room === 'Living Room') {
    return (
      <DashboardGrid>
        <CardSlot size="medium">
          <MediaCard
            id="media_player.living_room_tv_featured"
            name="Living Room TV"
            room="Living Room"
            title="Aerial"
            artist="Navet Studio"
            entityType="TV"
            entityPicture={sampleArtworkImage}
            state="playing"
            volume={42}
            isMuted={false}
            elapsedSeconds={86}
            durationSeconds={243}
            positionUpdatedAt={new Date('2026-05-16T12:00:00.000Z').toISOString()}
            supportsGrouping
            groupMembers={['Kitchen Speaker']}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
            simulateTvRemote
          />
        </CardSlot>
        <CardSlot size="medium">
          <LightCard
            id="light.sofa_lamp"
            name="Sofa lamp"
            room="Living Room"
            initialState
            initialBrightness={58}
            initialTemp={2900}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <CoverCard
            id="cover.patio_curtains"
            name="Patio curtains"
            room="Living Room"
            initialPosition={62}
            initialDeviceClass="curtain"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <GroupedSensorCard
            id="grouped_sensors.living_room_air"
            name="Living Room Air"
            room="Living Room"
            sensors={groupedSensors}
            accentColor="teal"
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
      </DashboardGrid>
    );
  }

  if (room === 'Bedroom' || room === 'Guest room') {
    return (
      <DashboardGrid>
        <CardSlot size="small">
          <LightCard
            id={`light.${roomSlug}`}
            name="Bedside lamp"
            room={room}
            initialState={room !== 'Guest room'}
            initialBrightness={35}
            initialTemp={2700}
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <HVACCard
            id={`climate.${roomSlug}`}
            name="Climate"
            room={room}
            initialTemp={21}
            initialCurrentTemp={20}
            initialMode="heat"
            initialAction="heating"
            initialState
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <SensorCard
            id={`sensor.${roomSlug}_humidity`}
            name="Humidity"
            room={room}
            value="47"
            unit="%"
            icon="gauge"
            subtitle="Sensor"
            size="small"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
      </DashboardGrid>
    );
  }

  if (room === 'Outside') {
    return (
      <DashboardGrid>
        <CardSlot size="medium">
          <CameraCard
            id="camera.front_door_room"
            name="Front Door Cam"
            room="Outside"
            entityPicture={sampleCameraFallbackImage}
            entityPictureSources={sampleCameraSources}
            supportedFeatures={0}
            isStreamCapable={false}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="small">
          <LockCard id="lock.front_door_room" name="Front Door" initialState size="small" />
        </CardSlot>
        <CardSlot size="small">
          <SwitchCard
            id="switch.porch_lights"
            name="Porch lights"
            initialState
            size="small"
            isEditMode={false}
          />
        </CardSlot>
        <CardSlot size="medium">
          <WeatherCard
            id="weather.outside_room"
            location="Home"
            temperature={18}
            feelsLikeTemperature={17}
            condition="partlycloudy"
            humidity={58}
            windSpeed={12}
            precipitation={0.4}
            precipitationUnit="mm"
            sunrise="05:08"
            sunset="20:51"
            daylight="15h 43m"
            rainForecast="Light rain possible later"
            forecast={forecast}
            forecastMode="weekly"
            highTemp={22}
            lowTemp={13}
            size="medium"
            onSizeChange={noopCardSizeChange}
            isEditMode={false}
          />
        </CardSlot>
      </DashboardGrid>
    );
  }

  return (
    <DashboardGrid>
      <CardSlot size="small">
        <LightCard
          id={`light.${roomSlug}_main`}
          name="Main light"
          room={room}
          initialState
          initialBrightness={52}
          initialTemp={3200}
          size="small"
          onSizeChange={noopCardSizeChange}
          isEditMode={false}
        />
      </CardSlot>
      <CardSlot size="small">
        <SensorCard
          id={`sensor.${roomSlug}_temperature`}
          name="Temperature"
          room={room}
          value="21.8"
          unit="C"
          icon="gauge"
          subtitle="Sensor"
          size="small"
          onSizeChange={noopCardSizeChange}
          isEditMode={false}
        />
      </CardSlot>
      <CardSlot size="small">
        <SwitchCard
          id={`switch.${roomSlug}_power`}
          name="Power"
          initialState={room !== 'Unassigned'}
          size="small"
          isEditMode={false}
        />
      </CardSlot>
    </DashboardGrid>
  );
}

function DemoSectionContent({ section, activeRoom }: { section: DemoSection; activeRoom: string }) {
  if (section === 'energy') return <EnergyShot />;
  if (section === 'climate') return <ClimateShot />;
  if (section === 'security') return <SecurityShot />;
  if (section === 'tasks') return <TasksShot />;
  if (section === 'lights') return <LightsShot />;
  if (section === 'media') return <MediaShot />;
  if (section === 'settings') return <SettingsShot />;
  return <HomeRoomShot activeRoom={activeRoom} />;
}

function getDemoSectionFromPath() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const demoSegmentIndex = pathSegments.indexOf('demo');

  if (demoSegmentIndex === -1) {
    return null;
  }

  return sanitizeDemoSection(pathSegments[demoSegmentIndex + 1]);
}

function sanitizeDemoSection(value: unknown): DemoSection {
  if (
    value === 'energy' ||
    value === 'climate' ||
    value === 'security' ||
    value === 'tasks' ||
    value === 'lights' ||
    value === 'media' ||
    value === 'settings'
  ) {
    return value;
  }

  return 'home';
}

function DemoContent() {
  useDemoDisplayDefaults();
  const [activeRoom, setActiveRoom] = useState<string>(ALL_ROOMS_ID);
  const activeSection = useNavigationStore((state) => state.activeSection);
  const demoSection = getDemoSectionFromPath();
  const section = sanitizeDemoSection(activeSection ?? demoSection ?? 'home');

  return (
    <DashboardLayout
      mobileRoomNavigation={
        section === 'home'
          ? { activeRoom, onRoomChange: setActiveRoom, rooms: DEMO_ROOMS }
          : undefined
      }
    >
      <div className="flex w-full flex-col gap-6">
        {section === 'home' ? (
          <RoomNav
            rooms={DEMO_ROOMS}
            activeRoom={activeRoom}
            onRoomChange={setActiveRoom}
            isEditMode={false}
            onToggleEditMode={() => undefined}
          />
        ) : null}
        <DemoSectionContent section={section} activeRoom={activeRoom} />
      </div>
    </DashboardLayout>
  );
}

export default function DemoApp() {
  return (
    <I18nProvider>
      <AuthProvider>
        <DemoContent />
      </AuthProvider>
    </I18nProvider>
  );
}
