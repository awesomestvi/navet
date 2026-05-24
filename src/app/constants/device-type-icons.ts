import {
  BadgeInfo,
  Blinds,
  Bot,
  Calendar,
  Camera,
  CircleAlert,
  CloudSun,
  DoorOpen,
  Droplets,
  Fan,
  Gauge,
  Home,
  Lightbulb,
  Lock,
  type LucideIcon,
  PanelTop,
  PersonStanding,
  Power,
  Radio,
  Snowflake,
  Sparkles,
  Speaker,
  Thermometer,
  Tv,
  User,
  Wind,
  Zap,
} from 'lucide-react';
import type { DeviceCollection } from '../types/device.types';

export const DEVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  lights: Lightbulb,
  fans: Fan,
  hvac: Snowflake,
  climate: Thermometer,
  media: Tv,
  weather: CloudSun,
  switches: Power,
  helpers: BadgeInfo,
  covers: Blinds,
  locks: Lock,
  scenes: Sparkles,
  persons: User,
  sensors: Gauge,
  vacuums: Bot,
  calendars: Calendar,
  cameras: Camera,
  'grouped-sensors': Radio,
} satisfies Partial<Record<keyof DeviceCollection, LucideIcon>>;

const MEDIA_DEVICE_CLASS_ICONS: Record<string, LucideIcon> = {
  speaker: Speaker,
  tv: Tv,
  television: Tv,
};

const SENSOR_DEVICE_CLASS_ICONS: Record<string, LucideIcon> = {
  carbon_dioxide: Wind,
  carbon_monoxide: Wind,
  door: DoorOpen,
  energy: Zap,
  garage_door: DoorOpen,
  gas: CircleAlert,
  humidity: Droplets,
  moisture: Droplets,
  motion: PersonStanding,
  occupancy: PersonStanding,
  opening: DoorOpen,
  power: Zap,
  presence: PersonStanding,
  problem: CircleAlert,
  smoke: CircleAlert,
  temperature: Thermometer,
  window: PanelTop,
};

export function getDeviceTypeIcon(type: string, deviceClass?: string): LucideIcon {
  if (type === 'media' && deviceClass) {
    return MEDIA_DEVICE_CLASS_ICONS[deviceClass.toLowerCase()] ?? Tv;
  }
  if (type === 'sensors' && deviceClass) {
    return SENSOR_DEVICE_CLASS_ICONS[deviceClass.toLowerCase()] ?? Gauge;
  }
  return DEVICE_TYPE_ICONS[type] ?? Home;
}
