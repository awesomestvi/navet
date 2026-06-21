/**
 * Main theme colors generator
 * Orchestrates domain-specific theme generators
 */

import { resolvePrimaryColorToken } from '@navet/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeMode as ThemeType } from '@navet/app/stores/theme-store';
import {
  generateCalendarTheme,
  generateClimateTheme,
  generateCoverTheme,
  generateLightTheme,
  generateLockTheme,
  generateMediaTheme,
  generatePersonTheme,
  generateRssTheme,
  generateSensorTheme,
  generateSwitchTheme,
  generateVacuumTheme,
} from './generate-domain-themes';
import { getInactiveThemeTone } from './get-inactive-tone';
import type { ThemeColors } from './theme-colors-types';

export function generateThemeColors(
  themeType: ThemeType,
  primaryColor: PrimaryColor,
  customPrimaryColor: string | null
): ThemeColors {
  const color = resolvePrimaryColorToken(primaryColor, customPrimaryColor);
  const inactiveTone = getInactiveThemeTone(themeType);

  return {
    light: generateLightTheme(themeType, color),
    climate: generateClimateTheme(themeType, inactiveTone),
    hvac: generateClimateTheme(themeType, inactiveTone),
    media: generateMediaTheme(themeType, color, inactiveTone),
    switch: generateSwitchTheme(themeType, color, inactiveTone),
    cover: generateCoverTheme(themeType, color, inactiveTone),
    lock: generateLockTheme(themeType),
    person: generatePersonTheme(themeType, color, inactiveTone),
    sensor: generateSensorTheme(themeType, color),
    vacuum: generateVacuumTheme(themeType, color, inactiveTone),
    rss: generateRssTheme(themeType, color),
    calendar: generateCalendarTheme(themeType, color),
  };
}
