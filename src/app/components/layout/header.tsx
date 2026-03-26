import { Bell, CalendarDays, Clock3, Search, X } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppReleaseBadge } from '@/app/components/shared/app-release-badge';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { NotificationPanel, useNotifications } from '@/app/features/notifications';
import { useDevices, useHomeAssistant, useI18n, useSearch, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { UserDropdown } from './user-dropdown';

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

export const Header = memo(function Header() {
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

  // Update filtered devices whenever search query changes
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      setFilteredDeviceIds([]);
      return;
    }

    const deviceGroups = [
      { domain: 'light', type: 'lights', items: devices.lights },
      { domain: 'climate', type: 'hvac', items: devices.hvac },
      { domain: 'switch', type: 'switches', items: devices.switches },
      { domain: 'cover', type: 'covers', items: devices.covers },
      { domain: 'lock', type: 'locks', items: devices.locks },
      { domain: 'media_player', type: 'media', items: devices.media },
      { domain: 'person', type: 'persons', items: devices.persons },
      { domain: 'sensor', type: 'sensors', items: devices.sensors },
      { domain: 'vacuum', type: 'vacuums', items: devices.vacuums },
      { domain: 'climate', type: 'climate', items: devices.climate },
      { domain: 'weather', type: 'weather', items: devices.weather },
      { domain: 'sensor', type: 'power', items: devices.power },
    ] as const;

    const matchingIds = deviceGroups.flatMap(({ domain, type, items }) =>
      items.flatMap((device) => {
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
  }, [searchQuery, devices, setFilteredDeviceIds]);

  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSecondary;
  const inputBg = surface.inputBg;
  const border = surface.border;
  const placeholder = surface.placeholder;
  const hoverBg = surface.hoverBg;
  const dividerColor = surface.textMuted;
  const activeColorValue = getThemeColorValue(primaryColor);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <div className="min-w-0">
              <div className="mb-0.5 md:mb-1">
                <h1
                  className={`min-w-0 text-[1.55rem] leading-none md:text-4xl font-bold ${textPrimary}`}
                >
                  <span>{t(greetingKey, { name: firstName })}</span>
                  <AppReleaseBadge className="ml-3 hidden align-middle translate-y-[-3px] shrink-0 lg:inline-flex" />
                </h1>
              </div>
              <div
                className={`${textSecondary} flex flex-wrap items-center gap-1.5 text-[0.82rem] md:hidden`}
              >
                <span>{formattedDate}</span>
                <span aria-hidden="true" className={dividerColor}>
                  |
                </span>
                <span>{formattedTime}</span>
                <span aria-hidden="true" className={dividerColor}>
                  |
                </span>
                <span>{t('header.weekLabel', { week: weekNumber })}</span>
              </div>
              <div
                className={`${textSecondary} hidden flex-wrap items-center gap-x-3 gap-y-1 text-sm md:flex`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock3 className={`h-3.5 w-3.5 ${textSecondary}`} />
                  <span>{formattedDate}</span>
                  <span aria-hidden="true" className={dividerColor}>
                    |
                  </span>
                  <span>{formattedTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className={`h-3.5 w-3.5 ${textSecondary}`} />
                  <span>{t('header.weekLabel', { week: weekNumber })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={handleToggleMobileSearch}
                className={`relative flex h-9 w-9 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`}
                aria-label={t('header.searchPlaceholder')}
                aria-expanded={isMobileSearchOpen}
              >
                {isMobileSearchOpen ? (
                  <X className={`h-5 w-5 ${textSecondary}`} />
                ) : (
                  <Search className={`h-5 w-5 ${textSecondary}`} />
                )}
              </button>

              <div className="relative h-9 w-9">
                <button
                  ref={mobileNotificationButtonRef}
                  type="button"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`}
                >
                  <Bell className={`w-5 h-5 ${textSecondary}`} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeColorValue }}
                    ></span>
                  )}
                </button>

                <NotificationPanel
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  triggerRefs={[mobileNotificationButtonRef, desktopNotificationButtonRef]}
                />
              </div>

              <UserDropdown avatarUrl={avatarUrl} />
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex md:gap-4">
          <div className="relative flex-1 md:flex-none">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`}
            />
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`${inputBg} border ${border} rounded-[22px] pl-10 pr-10 py-2 text-sm ${textPrimary} ${placeholder} focus:outline-none w-full md:w-64`}
              style={{
                borderColor: isSearchFocused ? activeColorValue : undefined,
                boxShadow: isSearchFocused ? `0 0 0 2px ${activeColorValue}22` : undefined,
                caretColor: activeColorValue,
              }}
            />
            {isSearchActive && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${hoverBg} transition-colors`}
              >
                <X className={`w-4 h-4 ${textSecondary}`} />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              ref={desktopNotificationButtonRef}
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`relative p-2 rounded-[22px] ${hoverBg} transition-colors`}
            >
              <Bell className={`w-5 h-5 ${textSecondary}`} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeColorValue }}
                ></span>
              )}
            </button>

            <NotificationPanel
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              triggerRefs={[mobileNotificationButtonRef, desktopNotificationButtonRef]}
            />
          </div>

          <UserDropdown avatarUrl={avatarUrl} />
        </div>
      </div>

      <div
        className={`relative overflow-hidden transition-[max-height,opacity,margin] duration-200 md:hidden ${
          isMobileSearchOpen || isSearchActive
            ? 'mt-0 max-h-16 opacity-100'
            : '-mt-1 max-h-0 opacity-0'
        }`}
      >
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input
            ref={mobileSearchInputRef}
            type="text"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              setIsSearchFocused(false);
              if (!searchQuery) {
                setIsMobileSearchOpen(false);
              }
            }}
            className={`${inputBg} border ${border} rounded-[22px] pl-10 pr-10 py-2 text-sm ${textPrimary} ${placeholder} focus:outline-none w-full`}
            style={{
              borderColor: isSearchFocused ? activeColorValue : undefined,
              boxShadow: isSearchFocused ? `0 0 0 2px ${activeColorValue}22` : undefined,
              caretColor: activeColorValue,
            }}
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${hoverBg} transition-colors`}
            >
              <X className={`w-4 h-4 ${textSecondary}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
