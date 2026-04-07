import type { CardSize } from '../components/shared/card-size-selector';
import type { SensorIconType } from '../features/sensors';
import type { WeatherForecastMode } from '../stores/settings-store';

export interface DeviceMetric {
  label: string;
  value: string | number;
  unit: string;
  icon: SensorIconType;
  category?: 'measurement' | 'configuration';
}

// Base device interface
export interface BaseDevice {
  id: string;
  name: string;
  size: CardSize;
}

// Light device
export interface LightDevice extends BaseDevice {
  room: string;
  state: boolean;
  brightness: number;
  temp: number;
}

// HVAC device
export interface HVACDevice extends BaseDevice {
  room: string;
  temp: number;
  mode: string;
}

// Climate device
export interface ClimateDevice extends BaseDevice {
  room: string;
  temperature: number;
  currentTemperature: number;
  mode: string;
  action?: string;
}

// Weather device
export interface WeatherDevice extends BaseDevice {
  room: string;
  temperature: number;
  location: string;
  condition: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  precipitation: number;
  precipitationUnit: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  highTemp: number;
  lowTemp: number;
  forecastMode: WeatherForecastMode;
  forecast: Array<{
    day: string;
    condition: string;
    high: number;
    low: number;
  }>;
}

// Media device
export interface MediaDevice extends BaseDevice {
  room: string;
  title: string;
  artist: string;
  entityType?: string;
  deviceClass?: string;
  entityPicture?: string;
  state: 'playing' | 'paused' | 'idle' | 'off';
  volume: number;
  isMuted: boolean;
  elapsedSeconds?: number;
  durationSeconds?: number;
  positionUpdatedAt?: string;
  supportsGrouping?: boolean;
  groupMembers?: string[];
}

// Switch device
export interface SwitchDevice extends BaseDevice {
  room: string;
  state: boolean;
  entityType?: string;
  serviceDomain?: string;
  serviceAction?: string;
  power?: number;
  voltage?: number;
  energy?: number;
  metrics?: DeviceMetric[];
}

export type HelperDevice = Pick<
  SwitchDevice,
  'id' | 'name' | 'room' | 'size' | 'state' | 'entityType' | 'serviceDomain' | 'serviceAction'
>;

// Cover device
export interface CoverDevice extends BaseDevice {
  room: string;
  position: number;
}

// Lock device
export interface LockDevice extends BaseDevice {
  room: string;
  state: boolean;
}

// Scene device
export interface SceneDevice extends BaseDevice {
  room: string;
}

// Person device
export interface PersonDevice extends BaseDevice {
  room: string;
  location: string;
  state: 'home' | 'away';
  entityPicture?: string;
}

// Sensor device
export interface SensorDevice extends BaseDevice {
  room: string;
  value: string;
  unit: string;
  icon?: SensorIconType;
  entityType?: string;
}

// Vacuum device
export interface VacuumDevice extends BaseDevice {
  room: string;
  status: 'cleaning' | 'returning' | 'docked' | 'paused' | 'idle';
  battery: number;
  cleanedArea?: string;
  cleaningTime?: string;
}

// Calendar device
export interface CalendarDevice extends BaseDevice {
  room: string;
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    timeDisplay: string;
    location?: string;
    type: 'meeting' | 'call' | 'event';
    color: string;
    attendees?: number;
    sortKey?: string;
    sourceId?: string;
    sourceName?: string;
  }>;
}

// Camera device
export interface CameraDevice extends BaseDevice {
  room: string;
  entityPicture?: string;
  state: string;
}

// Grouped Sensor device
export interface GroupedSensorDevice extends BaseDevice {
  room: string;
  sensors: Array<{
    id: string;
    label: string;
    value: string;
    unit: string;
    icon?: SensorIconType;
  }>;
  accentColor?: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';
}

// Union type for all devices
export type Device =
  | LightDevice
  | HVACDevice
  | ClimateDevice
  | WeatherDevice
  | MediaDevice
  | SwitchDevice
  | HelperDevice
  | CoverDevice
  | LockDevice
  | SceneDevice
  | PersonDevice
  | SensorDevice
  | VacuumDevice
  | CalendarDevice
  | GroupedSensorDevice
  | CameraDevice;

// Device collection
export interface DeviceCollection {
  lights: LightDevice[];
  hvac: HVACDevice[];
  climate: ClimateDevice[];
  media: MediaDevice[];
  weather: WeatherDevice[];
  switches: SwitchDevice[];
  helpers: HelperDevice[];
  covers: CoverDevice[];
  locks: LockDevice[];
  scenes: SceneDevice[];
  persons: PersonDevice[];
  sensors: SensorDevice[];
  vacuums: VacuumDevice[];
  calendars: CalendarDevice[];
  cameras: CameraDevice[];
  'grouped-sensors': GroupedSensorDevice[];
}

// Device with type information
export interface DeviceWithType
  extends Record<string, string | number | boolean | string[] | undefined> {
  id: string;
  type: keyof DeviceCollection;
}
