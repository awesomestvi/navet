import { resolveCardIconAppearance } from '@navet/app/components/shared/card-icon-appearance';
import { resolveLightIconComponent } from '@navet/app/constants/icon-map';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { storage } from '@navet/app/utils/storage';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UseSwitchCardAppearanceParams {
  id: string;
  isScript: boolean;
  defaultIconName?: string;
}

function getDefaultSwitchIconName(isScript: boolean, defaultIconName?: string) {
  if (defaultIconName) {
    return defaultIconName;
  }

  return isScript ? 'Play' : 'Power';
}

function normalizeStoredIcon(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStoredTint(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function useSwitchCardAppearance({
  id,
  isScript,
  defaultIconName: defaultIconNameOverride,
}: UseSwitchCardAppearanceParams): {
  HeaderIconComponent: LucideIcon | null;
  headerIconText: string | null;
  selectedIcon: string;
  setSelectedIcon: (iconName: string) => void;
  tintColor: string;
  setTintColor: (color: string) => void;
} {
  const defaultIconName = getDefaultSwitchIconName(isScript, defaultIconNameOverride);
  const iconStorageKey = `${STORAGE_KEYS.switchCardIcons}:${id}`;
  const tintStorageKey = `${STORAGE_KEYS.switchCardTintColors}:${id}`;
  const [selectedIcon, setSelectedIconState] = useState(() =>
    normalizeStoredIcon(storage.get<unknown>(iconStorageKey, defaultIconName), defaultIconName)
  );
  const [tintColor, setTintColor] = useState(() =>
    normalizeStoredTint(storage.get<unknown>(tintStorageKey, ''))
  );

  useEffect(() => {
    setSelectedIconState(
      normalizeStoredIcon(storage.get<unknown>(iconStorageKey, defaultIconName), defaultIconName)
    );
    setTintColor(normalizeStoredTint(storage.get<unknown>(tintStorageKey, '')));
  }, [defaultIconName, iconStorageKey, tintStorageKey]);

  useEffect(() => {
    storage.set(iconStorageKey, selectedIcon);
  }, [iconStorageKey, selectedIcon]);

  useEffect(() => {
    storage.set(tintStorageKey, tintColor);
  }, [tintColor, tintStorageKey]);

  const { iconComponent: HeaderIconComponent, iconText: headerIconText } =
    resolveCardIconAppearance(selectedIcon, resolveLightIconComponent(defaultIconName));

  const setSelectedIcon = (iconName: string) => {
    setSelectedIconState(iconName.trim() || defaultIconName);
  };

  return {
    HeaderIconComponent,
    headerIconText,
    selectedIcon,
    setSelectedIcon,
    tintColor,
    setTintColor,
  };
}
