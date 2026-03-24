import type { LucideIcon } from 'lucide-react';
import {
  Circle,
  CircleDashed,
  CircleDot,
  Flame,
  Flashlight,
  Lamp,
  LampCeiling,
  LampDesk,
  LampFloor,
  LampWallDown,
  LampWallUp,
  Lightbulb,
  Moon,
  MoonStar,
  Orbit,
  Sparkle,
  Star,
  StarHalf,
  SunDim,
  SunMedium,
  SunMoon,
  Sunrise,
  Sunset,
  Zap,
  ZapOff,
} from 'lucide-react';

export const LIGHT_ICON_MAP: Record<string, LucideIcon> = {
  Lightbulb: Lightbulb,
  Lamp: Lamp,
  LampDesk: LampDesk,
  LampFloor: LampFloor,
  LampCeiling: LampCeiling,
  LampWallDown: LampWallDown,
  LampWallUp: LampWallUp,
  Flashlight: Flashlight,
  Flame: Flame,
  Sun: SunMedium,
  SunDim: SunDim,
  Sunrise: Sunrise,
  Sunset: Sunset,
  SunMoon: SunMoon,
  Moon: Moon,
  MoonStar: MoonStar,
  Star: Star,
  StarHalf: StarHalf,
  Zap: Zap,
  ZapOff: ZapOff,
  Sparkle: Sparkle,
  Circle: Circle,
  CircleDot: CircleDot,
  CircleDashed: CircleDashed,
  Orbit: Orbit,
};

export const DEFAULT_LIGHT_ICON = 'Zap';

function toPascalCaseIconName(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
}

export function normalizeLightIconName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (LIGHT_ICON_MAP[trimmed]) {
    return trimmed;
  }

  const pascalCaseValue = toPascalCaseIconName(trimmed);
  if (LIGHT_ICON_MAP[pascalCaseValue]) {
    return pascalCaseValue;
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const matchedKey = Object.keys(LIGHT_ICON_MAP).find((key) => key.toLowerCase() === lowerTrimmed);
  if (matchedKey) {
    return matchedKey;
  }

  return trimmed;
}

export function resolveLightIconComponent(iconName: string) {
  return LIGHT_ICON_MAP[normalizeLightIconName(iconName)] ?? null;
}
