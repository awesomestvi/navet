import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
const emojiIconRegex = /\p{Extended_Pictographic}/u;
const lucideIconRegistry = new Map<string, LucideIcon>(
  Object.entries(LucideIcons).flatMap(([key, value]) =>
    /^[A-Z]/.test(key) && (typeof value === 'function' || typeof value === 'object')
      ? [[key, value as LucideIcon]]
      : []
  )
);
const lowerCaseLightIconMap = new Map(
  Object.keys(LIGHT_ICON_MAP).map((key) => [key.toLowerCase(), key] as const)
);
const lowerCaseLucideIconRegistry = new Map(
  Array.from(lucideIconRegistry.keys(), (key) => [key.toLowerCase(), key] as const)
);

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
  const matchedKey = lowerCaseLightIconMap.get(lowerTrimmed);
  if (matchedKey) {
    return matchedKey;
  }

  const lucideMatchedKey = lowerCaseLucideIconRegistry.get(lowerTrimmed);
  if (lucideMatchedKey) {
    return lucideMatchedKey;
  }

  const pascalCaseLucideMatch = lowerCaseLucideIconRegistry.get(pascalCaseValue.toLowerCase());
  if (pascalCaseLucideMatch) {
    return pascalCaseLucideMatch;
  }

  return pascalCaseValue || trimmed;
}

export function resolveLightIconComponent(iconName: string) {
  const normalizedIconName = normalizeLightIconName(iconName);
  if (!normalizedIconName) {
    return null;
  }

  if (LIGHT_ICON_MAP[normalizedIconName]) {
    return LIGHT_ICON_MAP[normalizedIconName];
  }

  return lucideIconRegistry.get(normalizedIconName) ?? null;
}

export function isEmojiLightIcon(iconName: string) {
  const trimmed = iconName.trim();
  if (!trimmed) {
    return false;
  }

  if (/[a-z0-9]/i.test(trimmed)) {
    return false;
  }

  return emojiIconRegex.test(trimmed);
}
