import { useMemo, useRef, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { useNotifications } from '@/app/features/notifications';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
import { useHeaderDateTime } from './use-header-datetime';
import { useHeaderSearch } from './use-header-search';

export function useHeaderController() {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const authConfig = useAuth(authSelectors.config);
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const user = useHomeAssistant(homeAssistantSelectors.user);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const { unreadCount } = useNotifications();
  const { t } = useI18n();

  const { formattedDate, formattedTime, greetingKey, weekNumber } = useHeaderDateTime();
  const {
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
    const entityPicture = Object.values(entities ?? {}).find((entity) => {
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
  }, [authConfig, entities, user?.name]);

  return {
    activeColorValue: getThemeColorValue(primaryColor),
    avatarUrl,
    border: surface.border,
    desktopNotificationButtonRef,
    dividerColor: surface.textMuted,
    firstName,
    formattedDate,
    formattedTime,
    greetingKey,
    handleClearSearch,
    handleSearchChange,
    handleToggleMobileSearch,
    hoverBg: surface.hoverBg,
    inputBg: surface.inputBg,
    isMobileSearchOpen,
    isNotificationOpen,
    isSearchActive,
    isSearchFocused,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    placeholder: surface.placeholder,
    searchQuery,
    setIsMobileSearchOpen,
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
