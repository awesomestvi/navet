import { resolveCardIconAppearance } from '@navet/app/components/shared/card-icon-appearance';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { SensorIconType } from '@navet/app/features/sensors/components/sensors';
import { storage } from '@navet/app/utils/storage';
import { useEffect, useState } from 'react';
import { iconMap } from './sensors';

function normalizeStoredIcon(value: unknown, fallback: string, defaultIcon: SensorIconType) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  if (defaultIcon === 'motion' && normalized === 'PersonStanding') {
    return fallback;
  }
  if (defaultIcon === 'battery' && normalized === 'Activity') {
    return fallback;
  }
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
    normalizeStoredIcon(
      storage.get<unknown>(iconStorageKey, defaultIconName),
      defaultIconName,
      defaultIcon
    )
  );

  useEffect(() => {
    setSelectedIconState(
      normalizeStoredIcon(
        storage.get<unknown>(iconStorageKey, defaultIconName),
        defaultIconName,
        defaultIcon
      )
    );
  }, [defaultIcon, defaultIconName, iconStorageKey]);

  useEffect(() => {
    storage.set(iconStorageKey, selectedIcon);
  }, [iconStorageKey, selectedIcon]);

  const { iconComponent: HeaderIconComponent, iconText: headerIconText } =
    resolveCardIconAppearance(selectedIcon, iconMap[defaultIcon] ?? iconMap.gauge);

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
