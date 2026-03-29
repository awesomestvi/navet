import { CalendarDays, Clock3 } from 'lucide-react';
import { memo } from 'react';
import { AppReleaseBadge } from '@/app/components/shared/app-release-badge';
import { HeaderDesktopActions, HeaderMobileActions } from './header-actions';
import { HeaderSearchInput } from './header-search-input';
import { useHeaderController } from './use-header-controller';

export const Header = memo(function Header() {
  const {
    activeColorValue,
    avatarUrl,
    desktopNotificationButtonRef,
    dividerColor,
    firstName,
    formattedDate,
    formattedTime,
    greetingKey,
    handleClearSearch,
    handleSearchChange,
    handleToggleMobileSearch,
    hoverBg,
    inputBg,
    isMobileSearchOpen,
    isNotificationOpen,
    isSearchActive,
    isSearchFocused,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    searchQuery,
    setIsMobileSearchOpen,
    setIsNotificationOpen,
    setIsSearchFocused,
    t,
    textPrimary,
    textSecondary,
    unreadCount,
    weekNumber,
  } = useHeaderController();

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <div className="min-w-0">
              <div className="mb-0.5 md:mb-1">
                <h1
                  className={`min-w-0 text-[1.55rem] leading-none font-bold md:text-[2rem] xl:text-4xl ${textPrimary}`}
                >
                  <span>{t(greetingKey, { name: firstName })}</span>
                  <AppReleaseBadge className="ml-3 hidden shrink-0 align-middle -translate-y-0.75 lg:inline-flex" />
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

            <HeaderMobileActions
              activeColorValue={activeColorValue}
              avatarUrl={avatarUrl}
              desktopNotificationButtonRef={desktopNotificationButtonRef}
              hoverBg={hoverBg}
              isMobileSearchOpen={isMobileSearchOpen}
              isNotificationOpen={isNotificationOpen}
              mobileNotificationButtonRef={mobileNotificationButtonRef}
              onToggleMobileSearch={handleToggleMobileSearch}
              setIsNotificationOpen={setIsNotificationOpen}
              searchAriaLabel={t('header.searchPlaceholder')}
              textSecondary={textSecondary}
              unreadCount={unreadCount}
            />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex md:gap-4">
          <div className="relative flex-1 md:flex-none">
            <HeaderSearchInput
              activeColorValue={activeColorValue}
              hoverBg={hoverBg}
              inputBg={inputBg}
              isSearchActive={isSearchActive}
              isSearchFocused={isSearchFocused}
              onBlur={() => setIsSearchFocused(false)}
              onChange={handleSearchChange}
              onClear={handleClearSearch}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t('header.searchPlaceholder')}
              query={searchQuery}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              widthClassName="w-full md:w-64"
            />
          </div>

          <HeaderDesktopActions
            activeColorValue={activeColorValue}
            avatarUrl={avatarUrl}
            desktopNotificationButtonRef={desktopNotificationButtonRef}
            hoverBg={hoverBg}
            isNotificationOpen={isNotificationOpen}
            mobileNotificationButtonRef={mobileNotificationButtonRef}
            setIsNotificationOpen={setIsNotificationOpen}
            textSecondary={textSecondary}
            unreadCount={unreadCount}
          />
        </div>
      </div>

      <div
        className={`relative overflow-hidden transition-[max-height,opacity,margin] duration-200 md:hidden ${
          isMobileSearchOpen || isSearchActive
            ? 'mt-0 max-h-16 opacity-100'
            : '-mt-1 max-h-0 opacity-0'
        }`}
      >
        <HeaderSearchInput
          activeColorValue={activeColorValue}
          hoverBg={hoverBg}
          inputBg={inputBg}
          inputRef={mobileSearchInputRef}
          isSearchActive={isSearchActive}
          isSearchFocused={isSearchFocused}
          onBlur={() => {
            setIsSearchFocused(false);
            if (!searchQuery) {
              setIsMobileSearchOpen(false);
            }
          }}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          onFocus={() => setIsSearchFocused(true)}
          placeholder={t('header.searchPlaceholder')}
          query={searchQuery}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />
      </div>
    </div>
  );
});
