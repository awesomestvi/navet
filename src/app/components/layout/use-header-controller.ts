import { useMemo, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useNotifications } from '@/app/features/notifications';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
import { useHeaderDateTime } from './use-header-datetime';
import { useHeaderSearch } from './use-header-search';

export type HeaderController = ReturnType<typeof useHeaderController>;

// Narrow to only person.* entities — the only domain this controller needs.
// Defined at module scope so the selector reference is stable and shallow equality
// can do its job: no re-render unless a person entity actually changes.
function selectPersonEntities(state: HomeAssistantStore) {
  if (!state.entities) return null;
  return Object.fromEntries(
    Object.entries(state.entities).filter(([id]) => id.startsWith('person.'))
  );
}

export function useHeaderController() {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const authConfig = useAuth(authSelectors.config);
  const personEntities = useHomeAssistant(selectPersonEntities, shallow);
  const user = useHomeAssistant(homeAssistantSelectors.user);
  const [isMobileUtilityOpen, setIsMobileUtilityOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const { unreadCount } = useNotifications();
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

  const avatarUrl = useMemo(() => {
    const entityPicture = Object.values(personEntities ?? {}).find((entity) => {
      if (!entity.entity_id.startsWith('person.')) {
        return false;
      }

      const friendlyName = entity.attributes?.friendly_name;
      return (
        typeof friendlyName === 'string' &&
        typeof user?.name === 'string' &&
        friendlyName.trim().toLowerCase() === user.name.trim().toLowerCase()
      );
    })?.attributes?.entity_picture;

    if (typeof entityPicture !== 'string' || !entityPicture) {
      return null;
    }

    if (entityPicture.startsWith('http://') || entityPicture.startsWith('https://')) {
      return entityPicture;
    }

    return authConfig ? `${authConfig.url}${entityPicture}` : entityPicture;
  }, [authConfig, personEntities, user?.name]);

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
