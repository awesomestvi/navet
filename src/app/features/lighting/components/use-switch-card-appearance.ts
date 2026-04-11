import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@/app/constants/icon-map';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { storage } from '@/app/utils/storage';

interface UseSwitchCardAppearanceParams {
  id: string;
  isScript: boolean;
}

function getDefaultSwitchIconName(isScript: boolean) {
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

export function useSwitchCardAppearance({ id, isScript }: UseSwitchCardAppearanceParams): {
  HeaderIconComponent: LucideIcon | null;
  headerIconText: string | null;
  selectedIcon: string;
  setSelectedIcon: (iconName: string) => void;
  tintColor: string;
  setTintColor: (color: string) => void;
} {
  const defaultIconName = getDefaultSwitchIconName(isScript);
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
        : ((customIconComponent ??
            resolveLightIconComponent(defaultIconName)) as LucideIcon | null),
    [customIconComponent, defaultIconName, headerIconText]
  );

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
