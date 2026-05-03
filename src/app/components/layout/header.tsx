import { CalendarDays, Clock3, SlidersHorizontal } from 'lucide-react';
import { memo } from 'react';
import { AppReleaseBadge } from '@/app/components/shared/app-release-badge';
import { NotificationPanel } from '@/app/features/notifications';
import { HeaderDesktopActions } from './header-actions';
import { HeaderSearchInput } from './header-search-input';
import type { MobileHeaderEditActions } from './mobile-header-actions';
import { MobileHeaderCommandSheet } from './mobile-header-command-sheet';
import { MobileRoomDropdown, type MobileRoomNavigation } from './mobile-room-dropdown';
import { type HeaderController, useHeaderController } from './use-header-controller';
import { UserDropdown } from './user-dropdown';

interface HeaderProps {
  controller?: HeaderController;
  mobileEditActions?: MobileHeaderEditActions;
  mobileRoomNavigation?: MobileRoomNavigation;
}

function HeaderView({
  controller,
  mobileEditActions,
  mobileRoomNavigation,
}: HeaderProps & { controller: HeaderController }) {
  const {
    activeColorValue,
    avatarUrl,
    closeNotifications,
    desktopNotificationButtonRef,
    dividerColor,
    firstName,
    formattedDate,
    formattedTime,
    greetingKey,
    handleClearSearch,
    handleSearchChange,
    hoverBg,
    inputBg,
    isMobileUtilityOpen,
    isNotificationOpen,
    isSearchActive,
    isSearchFocused,
    mobileNotificationButtonRef,
    openMobileUtility,
    openNotifications,
    searchQuery,
    setIsMobileUtilityOpen,
    setIsNotificationOpen,
    setIsSearchFocused,
    t,
    textPrimary,
    textSecondary,
    unreadCount,
    weekNumber,
  } = controller;

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <UserDropdown avatarUrl={avatarUrl} variant="mobile" />
        <div className="min-w-0 flex-1">
          <h1 className={`truncate text-[1rem] leading-none font-semibold ${textPrimary}`}>
            {t(greetingKey, { name: firstName })}
          </h1>
          <div
            className={`${textSecondary} mt-1 flex items-center gap-1 text-[0.72rem] leading-none`}
          >
            <span className="truncate">{formattedDate}</span>
            <span aria-hidden="true" className={dividerColor}>
              |
            </span>
            <span className="shrink-0">{formattedTime}</span>
          </div>
        </div>
        {mobileRoomNavigation ? (
          <MobileRoomDropdown navigation={mobileRoomNavigation} compact />
        ) : null}
        <button
          ref={mobileNotificationButtonRef}
          type="button"
          onClick={openMobileUtility}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`}
          aria-label={t('common.moreActions')}
          aria-expanded={isMobileUtilityOpen}
        >
          <SlidersHorizontal className={`h-[1.125rem] w-[1.125rem] ${textSecondary}`} />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: activeColorValue }}
            />
          ) : null}
        </button>
      </div>

      <div className="hidden md:flex md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0">
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
          </div>

          <div className="flex items-center gap-2 md:gap-4">
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
              renderPanel={false}
              setIsNotificationOpen={setIsNotificationOpen}
              textSecondary={textSecondary}
              unreadCount={unreadCount}
            />
          </div>
        </div>
      </div>

      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={closeNotifications}
        triggerRefs={[mobileNotificationButtonRef, desktopNotificationButtonRef]}
      />
      <MobileHeaderCommandSheet
        controller={controller}
        actions={mobileEditActions}
        isOpen={isMobileUtilityOpen}
        onOpenChange={setIsMobileUtilityOpen}
        onOpenNotifications={openNotifications}
      />
    </>
  );
}

function HeaderWithController({
  mobileEditActions,
  mobileRoomNavigation,
}: Omit<HeaderProps, 'controller'>) {
  const controller = useHeaderController();
  return (
    <HeaderView
      controller={controller}
      mobileEditActions={mobileEditActions}
      mobileRoomNavigation={mobileRoomNavigation}
    />
  );
}

export const Header = memo(function Header({
  controller,
  mobileEditActions,
  mobileRoomNavigation,
}: HeaderProps) {
  if (controller) {
    return (
      <HeaderView
        controller={controller}
        mobileEditActions={mobileEditActions}
        mobileRoomNavigation={mobileRoomNavigation}
      />
    );
  }

  return (
    <HeaderWithController
      mobileEditActions={mobileEditActions}
      mobileRoomNavigation={mobileRoomNavigation}
    />
  );
});
