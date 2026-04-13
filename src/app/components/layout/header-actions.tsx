import { Bell, Search, X } from 'lucide-react';
import type { RefObject } from 'react';
import { NotificationPanel } from '@/app/features/notifications';
import { useI18n } from '@/app/hooks';
import { UserDropdown } from './user-dropdown';

interface HeaderActionsProps {
  activeColorValue: string;
  avatarUrl: string | null;
  desktopNotificationButtonRef: RefObject<HTMLButtonElement | null>;
  hoverBg: string;
  isMobileSearchOpen: boolean;
  isNotificationOpen: boolean;
  mobileNotificationButtonRef: RefObject<HTMLButtonElement | null>;
  onToggleMobileSearch: () => void;
  setIsNotificationOpen: (open: boolean) => void;
  searchAriaLabel: string;
  textSecondary: string;
  unreadCount: number;
}

export function HeaderMobileActions({
  activeColorValue,
  avatarUrl,
  desktopNotificationButtonRef,
  hoverBg,
  isMobileSearchOpen,
  isNotificationOpen,
  mobileNotificationButtonRef,
  onToggleMobileSearch,
  setIsNotificationOpen,
  searchAriaLabel,
  textSecondary,
  unreadCount,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <button
        type="button"
        onClick={onToggleMobileSearch}
        className={`relative flex h-9 w-9 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`}
        aria-label={searchAriaLabel}
        aria-expanded={isMobileSearchOpen}
      >
        {isMobileSearchOpen ? (
          <X className={`h-5 w-5 ${textSecondary}`} />
        ) : (
          <Search className={`h-5 w-5 ${textSecondary}`} />
        )}
      </button>

      <HeaderNotificationButton
        activeColorValue={activeColorValue}
        desktopNotificationButtonRef={desktopNotificationButtonRef}
        hoverBg={hoverBg}
        isNotificationOpen={isNotificationOpen}
        mobileNotificationButtonRef={mobileNotificationButtonRef}
        setIsNotificationOpen={setIsNotificationOpen}
        textSecondary={textSecondary}
        unreadCount={unreadCount}
        mobile
      />

      <UserDropdown avatarUrl={avatarUrl} />
    </div>
  );
}

export function HeaderDesktopActions({
  activeColorValue,
  avatarUrl,
  desktopNotificationButtonRef,
  hoverBg,
  isNotificationOpen,
  mobileNotificationButtonRef,
  setIsNotificationOpen,
  textSecondary,
  unreadCount,
}: Omit<HeaderActionsProps, 'isMobileSearchOpen' | 'onToggleMobileSearch' | 'searchAriaLabel'>) {
  return (
    <>
      <HeaderNotificationButton
        activeColorValue={activeColorValue}
        desktopNotificationButtonRef={desktopNotificationButtonRef}
        hoverBg={hoverBg}
        isNotificationOpen={isNotificationOpen}
        mobileNotificationButtonRef={mobileNotificationButtonRef}
        setIsNotificationOpen={setIsNotificationOpen}
        textSecondary={textSecondary}
        unreadCount={unreadCount}
      />
      <UserDropdown avatarUrl={avatarUrl} />
    </>
  );
}

function HeaderNotificationButton({
  activeColorValue,
  desktopNotificationButtonRef,
  hoverBg,
  isNotificationOpen,
  mobile = false,
  mobileNotificationButtonRef,
  setIsNotificationOpen,
  textSecondary,
  unreadCount,
}: {
  activeColorValue: string;
  desktopNotificationButtonRef: RefObject<HTMLButtonElement | null>;
  hoverBg: string;
  isNotificationOpen: boolean;
  mobile?: boolean;
  mobileNotificationButtonRef: RefObject<HTMLButtonElement | null>;
  setIsNotificationOpen: (open: boolean) => void;
  textSecondary: string;
  unreadCount: number;
}) {
  const buttonRef = mobile ? mobileNotificationButtonRef : desktopNotificationButtonRef;
  const { t } = useI18n();

  return (
    <div className={mobile ? 'relative h-9 w-9' : 'relative'}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('notifications.title')}
        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
        className={
          mobile
            ? `relative flex h-9 w-9 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`
            : `relative rounded-[22px] p-2 ${hoverBg} transition-colors`
        }
      >
        <Bell className={`h-5 w-5 ${textSecondary}`} />
        {unreadCount > 0 ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: activeColorValue }}
          />
        ) : null}
      </button>

      {!mobile ? (
        <NotificationPanel
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          triggerRefs={[mobileNotificationButtonRef, desktopNotificationButtonRef]}
        />
      ) : null}
    </div>
  );
}
