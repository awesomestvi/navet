import type { HassEntity } from 'home-assistant-js-websocket';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import {
  DEFAULT_LIGHT_ICON,
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@/app/constants/icon-map';
import { TEMP_OPTIONS } from '@/app/constants/light-constants';
import {
  getSupportedColorTemperatureRange,
  supportsColorSelection,
  supportsColorTemperatureControl,
} from './light-card-utils';

interface UseLightCardDisplayParams {
  selectedIcon: string;
  size: CardSize;
  liveEntity: HassEntity | undefined;
}

interface UseLightCardDisplayResult {
  isSmall: boolean;
  padding: string;
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
}: UseLightCardDisplayParams): UseLightCardDisplayResult {
  const supportsColorTemperature = supportsColorTemperatureControl(liveEntity);
  const supportsColorControl = supportsColorSelection(liveEntity);
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
    supportsColorTemperature,
    supportsColorControl,
    minColorTemp,
    maxColorTemp,
    tempOptions,
    IconComponent,
    iconText,
  };
}
