import { useMemo, useRef, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { readNavetPersonState } from '@/app/core/navet-device-state';
import { useProviderNotifications } from '@/app/features/notifications';
import { useI18n, useIntegrationStore, useProviderResource, useTheme } from '@/app/hooks';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHeaderDateTime } from './use-header-datetime';
import { useHeaderSearch } from './use-header-search';

export type HeaderController = ReturnType<typeof useHeaderController>;

export function useHeaderController() {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const devicesByCanonicalId = useIntegrationStore(integrationSelectors.devicesByCanonicalId);
  const user = useIntegrationStore(integrationSelectors.currentUser);
  const [isMobileUtilityOpen, setIsMobileUtilityOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const { unreadCount } = useProviderNotifications();
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

  const matchedPersonDevice = useMemo(() => {
    const normalizedUserName = user?.name?.trim().toLowerCase();
    if (!normalizedUserName) {
      return null;
    }

    return (
      Object.values(devicesByCanonicalId).find((device) => {
        if (device.providerId !== currentProviderId || device.kind !== 'person') {
          return false;
        }

        return device.name.trim().toLowerCase() === normalizedUserName;
      }) ?? null
    );
  }, [currentProviderId, devicesByCanonicalId, user?.name]);

  const matchedPersonState = readNavetPersonState(matchedPersonDevice);
  const avatarRequestKey = [
    matchedPersonDevice?.resources?.primary_image?.path,
    matchedPersonState?.entityPicture,
    matchedPersonDevice?.providerId,
  ]
    .filter(Boolean)
    .join('::');
  const avatarResource = useProviderResource({
    deviceId: matchedPersonDevice?.canonicalId ?? '',
    kind: 'primary_image',
    attrs: matchedPersonDevice?.resources?.primary_image?.path
      ? { entity_picture: matchedPersonDevice.resources.primary_image.path }
      : undefined,
    fallbackPicture: matchedPersonState?.entityPicture,
    providerId: matchedPersonDevice?.providerId,
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
