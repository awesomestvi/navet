import { useEffect, useMemo, useRef, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { useNotifications } from '@/app/features/notifications';
import { useDevices, useHomeAssistant, useI18n, useSearch, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import { homeAssistantSelectors } from '@/app/stores/selectors';

function getGreetingKey(hour: number): TranslationKey {
  const casual: TranslationKey[] = [
    'header.greeting.hi',
    'header.greeting.hey',
    'header.greeting.welcome',
  ];
  if (Math.random() < 0.25) {
    return casual[Math.floor(Math.random() * casual.length)];
  }
  if (hour >= 5 && hour < 12) return 'header.greeting.morning';
  if (hour >= 12 && hour < 17) return 'header.greeting.afternoon';
  if (hour >= 17 && hour < 21) return 'header.greeting.evening';
  return 'header.greeting.night';
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

const DEVICE_GROUPS = [
  { domain: 'light', type: 'lights', deviceKey: 'lights' },
  { domain: 'climate', type: 'hvac', deviceKey: 'hvac' },
  { domain: 'switch', type: 'switches', deviceKey: 'switches' },
  { domain: 'cover', type: 'covers', deviceKey: 'covers' },
  { domain: 'lock', type: 'locks', deviceKey: 'locks' },
  { domain: 'media_player', type: 'media', deviceKey: 'media' },
  { domain: 'person', type: 'persons', deviceKey: 'persons' },
  { domain: 'sensor', type: 'sensors', deviceKey: 'sensors' },
  { domain: 'vacuum', type: 'vacuums', deviceKey: 'vacuums' },
  { domain: 'climate', type: 'climate', deviceKey: 'climate' },
  { domain: 'weather', type: 'weather', deviceKey: 'weather' },
  { domain: 'sensor', type: 'power', deviceKey: 'power' },
] as const;

export function useHeaderController() {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { config: authConfig } = useAuth();
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const user = useHomeAssistant(homeAssistantSelectors.user);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [greetingKey] = useState(() => getGreetingKey(new Date().getHours()));
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const { searchQuery, setSearchQuery, setFilteredDeviceIds, clearSearch, isSearchActive } =
    useSearch();
  const devices = useDevices();
  const { unreadCount } = useNotifications();
  const { formatDate, formatTime, t } = useI18n();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000 * 30);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      setFilteredDeviceIds([]);
      return;
    }

    const matchingIds = DEVICE_GROUPS.flatMap(({ domain, type, deviceKey }) =>
      devices[deviceKey].flatMap((device) => {
        const searchableValues = new Set<string>([
          device.id.toLowerCase(),
          domain,
          `${domain}.`,
          type,
          String(device.name).toLowerCase(),
        ]);

        if ('room' in device && typeof device.room === 'string') {
          searchableValues.add(device.room.toLowerCase());
        }

        if ('location' in device && typeof device.location === 'string') {
          searchableValues.add(device.location.toLowerCase());
        }

        if ('entityType' in device && typeof device.entityType === 'string') {
          searchableValues.add(device.entityType.toLowerCase());
        }

        const matches = Array.from(searchableValues).some((value) => {
          if (value === query) {
            return true;
          }

          if (value.startsWith(query)) {
            return true;
          }

          return value.includes(query);
        });

        return matches ? [device.id] : [];
      })
    );

    setFilteredDeviceIds(matchingIds);
  }, [devices, searchQuery, setFilteredDeviceIds]);

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

  const formattedDate = useMemo(
    () => formatDate(currentDateTime, { weekday: 'short', month: 'long', day: 'numeric' }),
    [currentDateTime, formatDate]
  );

  const formattedTime = useMemo(
    () => formatTime(currentDateTime, { hour: '2-digit', minute: '2-digit' }, false),
    [currentDateTime, formatTime]
  );

  const weekNumber = useMemo(() => getWeekNumber(currentDateTime), [currentDateTime]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleClearSearch = () => {
    clearSearch();
    setIsMobileSearchOpen(false);
  };

  const handleToggleMobileSearch = () => {
    setIsMobileSearchOpen((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
      }
      return next;
    });
  };

  return {
    activeColorValue: getThemeColorValue(primaryColor),
    avatarUrl,
    desktopNotificationButtonRef,
    dividerColor: surface.textMuted,
    formattedDate,
    formattedTime,
    greetingKey,
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
    firstName,
    handleClearSearch,
    handleSearchChange,
    handleToggleMobileSearch,
    border: surface.border,
  };
}
