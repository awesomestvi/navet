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
  const providerEntitiesByCanonicalId = useIntegrationStore(
    integrationSelectors.providerEntitiesByCanonicalId
  );
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

  const matchedPersonEntity = useMemo(() => {
    const normalizedUserName = user?.name?.trim().toLowerCase();
    if (!normalizedUserName) {
      return null;
    }

    return (
      Object.values(providerEntitiesByCanonicalId).find((entity) => {
        if (entity.providerId !== currentProviderId || entity.type !== 'person') {
          return false;
        }

        return entity.name.trim().toLowerCase() === normalizedUserName;
      }) ?? null
    );
  }, [currentProviderId, providerEntitiesByCanonicalId, user?.name]);

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
