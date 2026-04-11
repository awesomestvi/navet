import { useEffect, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { ArrivalField, ArrivalPhase, ArrivalVariant } from './dashboard-arrival-reveal.view';
import { getDashboardArrivalRevealTokens } from './dashboard-arrival-reveal-tokens';

function arrivalKey(
  variant: ArrivalVariant,
  field: ArrivalField
): `dashboard.arrival.${ArrivalVariant}.${ArrivalField}` {
  return `dashboard.arrival.${variant}.${field}`;
}

export function useDashboardArrivalReveal(
  open: boolean,
  onComplete: () => void,
  variant: ArrivalVariant
) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const [phase, setPhase] = useState<ArrivalPhase>('baking');

  useEffect(() => {
    if (!open) {
      return;
    }

    setPhase('baking');
    const timeoutId = window.setTimeout(() => setPhase('revealed'), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (phase !== 'exiting') {
      return;
    }

    const timeoutId = window.setTimeout(onComplete, 900);
    return () => window.clearTimeout(timeoutId);
  }, [onComplete, phase]);

  const copy = {
    bakingKicker: t(arrivalKey(variant, 'bakingKicker')),
    bakingHeading: t(arrivalKey(variant, 'bakingHeading')),
    bakingBody: t(arrivalKey(variant, 'bakingBody')),
    revealKicker: t(arrivalKey(variant, 'revealKicker')),
    revealHeading: t(arrivalKey(variant, 'revealHeading')),
    revealBody: t(arrivalKey(variant, 'revealBody')),
    enter: t('dashboard.arrival.enter'),
  };
  const accentColor = getThemeColorValue(primaryColor);
  const tokens = getDashboardArrivalRevealTokens(theme, accentColor);

  return {
    accentColor,
    copy,
    effectsQuality,
    phase,
    setPhase,
    theme,
    ...tokens,
  };
}

export type DashboardArrivalRevealController = ReturnType<typeof useDashboardArrivalReveal>;
