import {
  BadgeInfo,
  Blinds,
  Bot,
  Calendar,
  Camera,
  CloudSun,
  Gauge,
  Home,
  Lightbulb,
  Lock,
  type LucideIcon,
  Power,
  Radio,
  Snowflake,
  Sparkles,
  Speaker,
  Thermometer,
  Tv,
  User,
} from 'lucide-react';
import type { DeviceCollection } from '../types/device.types';

export const DEVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  lights: Lightbulb,
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

export function getDeviceTypeIcon(type: string, deviceClass?: string): LucideIcon {
  if (type === 'media' && deviceClass) {
    return MEDIA_DEVICE_CLASS_ICONS[deviceClass.toLowerCase()] ?? Tv;
  }
  return DEVICE_TYPE_ICONS[type] ?? Home;
}
