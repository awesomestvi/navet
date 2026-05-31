import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { readNavetPersonState } from '@navet/app/core/navet-device-state';
import { useNotificationBadgeCount } from '@navet/app/features/notifications/components/notifications/use-notification-badge-count';
import { useI18n, useIntegrationStore, useProviderResource, useTheme } from '@navet/app/hooks';
import { integrationSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { PersonDevice } from '@navet/app/types/device.types';
import { useMemo, useRef, useState } from 'react';
import { useHeaderDateTime } from './use-header-datetime';
import { useHeaderSearch } from './use-header-search';

export type HeaderController = ReturnType<typeof useHeaderController>;
const EMPTY_PERSON_DEVICES: PersonDevice[] = [];

export function useHeaderController() {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const user = useIntegrationStore(integrationSelectors.currentUser);
  const shouldResolveAvatarFromProvider = !lowPowerMode && !user?.avatarUrl;
  const providerPersons = useIntegrationStore(
    (state) =>
      shouldResolveAvatarFromProvider
        ? (integrationSelectors.providerDeviceCollectionById(currentProviderId)(state)?.persons ??
          EMPTY_PERSON_DEVICES)
        : EMPTY_PERSON_DEVICES,
    Object.is
  );
  const [isMobileUtilityOpen, setIsMobileUtilityOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const unreadCount = useNotificationBadgeCount({ includeUpdates: !lowPowerMode });
  const { t } = useI18n();

  const { formattedDate, formattedTime, greetingKey, weekNumber } = useHeaderDateTime();
  const {
    closeMobileSearch,
    handleClearSearch,
    handleSearchChange,
    handleToggleMobileSearch,
    isMobileSearchOpen,
    isSearchActive,
    isSearchFocused,
    mobileSearchInputRef,
    searchQuery,
    setIsMobileSearchOpen,
    setIsSearchFocused,
  } = useHeaderSearch();

  const firstName = useMemo(() => {
    const fullName = user?.name?.trim();
    if (!fullName) {
      return t('header.guestName');
    }

    return fullName.split(/\s+/)[0];
  }, [t, user?.name]);

  const matchedPersonCanonicalId = useMemo(() => {
    if (lowPowerMode || user?.avatarUrl) {
      return null;
    }

    const normalizedUserName = user?.name?.trim().toLowerCase();
    if (!normalizedUserName) {
      return null;
    }

    return (
      providerPersons.find((person) => person.name.trim().toLowerCase() === normalizedUserName)
        ?.canonicalId ?? null
    );
  }, [lowPowerMode, providerPersons, user?.avatarUrl, user?.name]);
  const matchedPersonEntity = useIntegrationStore(
    (state) =>
      matchedPersonCanonicalId
        ? integrationSelectors.providerEntityByLookup(
            currentProviderId,
            matchedPersonCanonicalId
          )(state)
        : null,
    Object.is
  );

  const matchedPersonState = readNavetPersonState(matchedPersonEntity);
  const avatarRequestKey = [
    matchedPersonEntity?.resources?.primary_image?.path,
    matchedPersonState?.entityPicture,
    matchedPersonEntity?.providerId,
  ]
    .filter(Boolean)
    .join('::');
  const avatarResource = useProviderResource({
    deviceId: matchedPersonEntity?.canonicalId ?? '',
    kind: 'primary_image',
    attrs: matchedPersonEntity?.resources?.primary_image?.path
      ? { entity_picture: matchedPersonEntity.resources.primary_image.path }
      : undefined,
    fallbackPicture: matchedPersonState?.entityPicture,
    providerId: matchedPersonEntity?.providerId,
    requestKey: avatarRequestKey,
  });

  const avatarUrl = useMemo(() => {
    if (avatarResource?.kind === 'image' && avatarResource.url) {
      return avatarResource.url;
    }

    return user?.avatarUrl ?? null;
  }, [avatarResource, user?.avatarUrl]);

  return {
    activeColorValue: getThemeColorValue(primaryColor),
    avatarUrl,
    border: surface.border,
    closeMobileUtility: () => setIsMobileUtilityOpen(false),
    desktopNotificationButtonRef,
    dividerColor: surface.textMuted,
    firstName,
    formattedDate,
    formattedTime,
    greetingKey,
    closeMobileSearch,
    closeNotifications: () => setIsNotificationOpen(false),
    handleClearSearch,
    handleSearchChange,
    handleToggleMobileSearch,
    hoverBg: surface.hoverBg,
    inputBg: surface.inputBg,
    isMobileSearchOpen,
    isMobileUtilityOpen,
    isNotificationOpen,
    isSearchActive,
    isSearchFocused,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    openMobileUtility: () => setIsMobileUtilityOpen(true),
    openNotifications: () => setIsNotificationOpen(true),
    placeholder: surface.placeholder,
    searchQuery,
    setIsMobileSearchOpen,
    setIsMobileUtilityOpen,
    setIsNotificationOpen,
    setIsSearchFocused,
    surface,
    t,
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    unreadCount,
    weekNumber,
  };
}
