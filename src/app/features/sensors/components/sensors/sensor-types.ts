import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlarmSmoke,
  CircleAlert,
  DoorOpen,
  Droplets,
  Gauge,
  PanelTop,
  PersonStanding,
  ShieldCheck,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
} from 'lucide-react';

export type SensorIconType =
  | 'zap'
  | 'thermometer'
  | 'droplets'
  | 'gauge'
  | 'trend-up'
  | 'trend-down'
  | 'activity'
  | 'wind'
  | 'sun'
  | 'motion'
  | 'door'
  | 'window'
  | 'alert'
  | 'shield'
  | 'smoke';

export interface SensorReading {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon?: SensorIconType;
  entityType?: string;
}

export interface SensorColorScheme {
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  accent: string;
  glow: string;
}

export type AccentColor = 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';

export const iconMap: Record<SensorIconType, LucideIcon> = {
  zap: Zap,
  thermometer: Thermometer,
  droplets: Droplets,
  gauge: Gauge,
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  activity: Activity,
  wind: Wind,
  sun: Sun,
  motion: PersonStanding,
  door: DoorOpen,
  window: PanelTop,
  alert: CircleAlert,
  shield: ShieldCheck,
  smoke: AlarmSmoke,
};
