import {
  type CardSize,
  isExtraSmallCardSize,
} from '@navet/app/components/shared/card-size-selector';
import {
  DEFAULT_LIGHT_ICON,
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@navet/app/constants/icon-map';
import { TEMP_OPTIONS } from '@navet/app/constants/light-constants';
import type { NavetLightState } from '@navet/app/core/navet-device-state';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  getSupportedColorTemperatureRange,
  supportsBrightnessControl,
  supportsColorSelection,
  supportsColorTemperatureControl,
} from './light-card-utils';

interface UseLightCardDisplayParams {
  selectedIcon: string;
  size: CardSize;
  liveEntity: PlatformEntitySnapshot | undefined;
  initialTemp: number;
  providerState?: NavetLightState | null;
  supportsAdvancedLightControls: boolean;
}

interface UseLightCardDisplayResult {
  isSmall: boolean;
  padding: string;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  minColorTemp: number;
  maxColorTemp: number;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  IconComponent: LucideIcon | null;
  iconText: string | null;
}

export function useLightCardDisplay({
  selectedIcon,
  size,
  liveEntity,
  initialTemp: _initialTemp,
  providerState,
  supportsAdvancedLightControls,
}: UseLightCardDisplayParams): UseLightCardDisplayResult {
  const supportsBrightness =
    (liveEntity ? supportsBrightnessControl(liveEntity) : false) ||
    typeof providerState?.brightnessPct === 'number';
  const supportsColorTemperature =
    (liveEntity ? supportsColorTemperatureControl(liveEntity) : false) ||
    typeof providerState?.colorTemperatureKelvin === 'number';
  const supportsColorControl =
    supportsAdvancedLightControls && Boolean(liveEntity) && supportsColorSelection(liveEntity);
  const { max: maxColorTemp, min: minColorTemp } = getSupportedColorTemperatureRange(liveEntity);

  const tempOptions = useMemo(
    () =>
      TEMP_OPTIONS.filter((option) => option.value >= minColorTemp && option.value <= maxColorTemp),
    [minColorTemp, maxColorTemp]
  );

  const isExtraSmall = isExtraSmallCardSize(size);
  const isSmall = isExtraSmall || size === 'small';
  const padding = 'p-3';

  const normalizedSelectedIcon = normalizeLightIconName(selectedIcon);
  const customIconComponent = normalizedSelectedIcon
    ? resolveLightIconComponent(normalizedSelectedIcon)
    : null;
  const iconText =
    !customIconComponent && isEmojiLightIcon(selectedIcon) ? selectedIcon.trim() : null;
  const IconComponent = iconText
    ? null
    : ((customIconComponent ?? resolveLightIconComponent(DEFAULT_LIGHT_ICON)) as LucideIcon);

  return {
    isSmall,
    padding,
    supportsBrightness,
    supportsColorTemperature,
    supportsColorControl,
    minColorTemp,
    maxColorTemp,
    tempOptions,
    IconComponent,
    iconText,
  };
}
