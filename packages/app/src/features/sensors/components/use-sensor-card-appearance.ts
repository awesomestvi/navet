import {
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@navet/app/constants/icon-map';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { SensorIconType } from '@navet/app/features/sensors';
import { storage } from '@navet/app/utils/storage';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { iconMap } from './sensors';

function normalizeStoredIcon(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function useSensorCardAppearance({
  id,
  defaultIcon,
}: {
  id: string;
  defaultIcon: SensorIconType;
}) {
  const defaultIconName =
    iconMap[defaultIcon]?.displayName ?? iconMap[defaultIcon]?.name ?? 'Gauge';
  const iconStorageKey = `${STORAGE_KEYS.sensorCardIcons}:${id}`;
  const [selectedIcon, setSelectedIconState] = useState(() =>
    normalizeStoredIcon(storage.get<unknown>(iconStorageKey, defaultIconName), defaultIconName)
  );

  useEffect(() => {
    setSelectedIconState(
      normalizeStoredIcon(storage.get<unknown>(iconStorageKey, defaultIconName), defaultIconName)
    );
  }, [defaultIconName, iconStorageKey]);

  useEffect(() => {
    storage.set(iconStorageKey, selectedIcon);
  }, [iconStorageKey, selectedIcon]);

  const normalizedSelectedIcon = normalizeLightIconName(selectedIcon);
  const customIconComponent = normalizedSelectedIcon
    ? resolveLightIconComponent(normalizedSelectedIcon)
    : null;
  const headerIconText =
    !customIconComponent && isEmojiLightIcon(selectedIcon) ? selectedIcon.trim() : null;
  const HeaderIconComponent = useMemo(
    () =>
      headerIconText
        ? null
        : ((customIconComponent ?? iconMap[defaultIcon] ?? iconMap.gauge) as LucideIcon | null),
    [customIconComponent, defaultIcon, headerIconText]
  );

  const setSelectedIcon = (iconName: string) => {
    setSelectedIconState(iconName.trim() || defaultIconName);
  };

  return {
    HeaderIconComponent,
    headerIconText,
    selectedIcon,
    setSelectedIcon,
  };
}
