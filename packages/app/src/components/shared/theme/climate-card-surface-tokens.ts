import type { ThemeType } from '@navet/app/hooks/use-theme';
import {
  getHVACCardSurfaceTokens as getLegacyClimateCardSurfaceTokens,
  getHVACGaugeSurfaceTokens as getLegacyClimateGaugeSurfaceTokens,
  type HVACCardSurfaceTokens as LegacyClimateCardSurfaceTokens,
  type HVACGaugeSurfaceTokens as LegacyClimateGaugeSurfaceTokens,
} from './hvac-card-surface-tokens';

export type ClimateCardSurfaceTokens = LegacyClimateCardSurfaceTokens;
export type ClimateGaugeSurfaceTokens = LegacyClimateGaugeSurfaceTokens;

export function getClimateCardSurfaceTokens(
  theme: ThemeType,
  mode?: 'heat' | 'cool' | 'heat_cool' | 'fan_only' | 'off'
): ClimateCardSurfaceTokens {
  return getLegacyClimateCardSurfaceTokens(theme, mode);
}

export function getClimateGaugeSurfaceTokens(
  theme: ThemeType,
  temperatureColor?: string
): ClimateGaugeSurfaceTokens {
  return getLegacyClimateGaugeSurfaceTokens(theme, temperatureColor);
}
