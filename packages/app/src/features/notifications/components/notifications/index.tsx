import { Button } from '@navet/app/components/primitives/button';
import { IconButton } from '@navet/app/components/primitives/icon-button';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { SheetSurface, SheetSurfaceHeader } from '@navet/app/components/primitives/sheet-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getUiKitGlassSurfaceFoundationStyle } from '@navet/app/components/system/tokens/ui-kit-surfaces';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import {
  type PrimaryColor,
  type ThemeType,
  useI18n,
  useMediaQuery,
  useTheme,
} from '@navet/app/hooks';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type RefObject, useEffect, useId, useState } from 'react';
import { NotificationEmptyState } from './notification-empty-state';
import { NotificationHeader } from './notification-header';
import { NotificationItem } from './notification-item';
import { getNotificationSurfaceTokens } from './notification-surface-tokens';
import { formatTimestamp, getColorValue } from './notification-utils';
import type { Notification, PlatformNotificationsReturn } from './use-notifications';
import { useProviderNotifications } from './use-provider-notifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRefs?: Array<RefObject<HTMLElement | null>>;
}

export function NotificationPanel(props: NotificationPanelProps) {
  const notifications = useProviderNotifications();
  return <NotificationCenter {...props} {...notifications} />;
}

export function NotificationCenter({
  isOpen,
  onClose,
  triggerRefs,
  notifications,
  unreadCount,
  runPrimaryAction,
  markAllAsRead,
  deleteNotification,
  clearAll,
}: NotificationPanelProps & PlatformNotificationsReturn) {
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const tabsId = useId();
  const [section, setSection] = useState<'notifications' | 'updates'>('notifications');
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const surface = getNotificationSurfaceTokens(theme);
  const sharedSurface = getThemeSurfaceTokens(theme);
  const updates = notifications.filter((item) => item.source === 'update');
  const messages = notifications.filter((item) => item.source !== 'update');
  const visible = section === 'updates' ? updates : messages;

  useEffect(() => {
    if (!isOpen) {
      setShowClearAllConfirm(false);
      setSection('notifications');
    }
  }, [isOpen]);

  const formatRelativeTimestamp = (date: Date) =>
    formatTimestamp(date, {
      daysAgo: t('notifications.time.daysAgo', { count: '{count}' }),
      hoursAgo: t('notifications.time.hoursAgo', { count: '{count}' }),
      justNow: t('notifications.time.justNow'),
      minutesAgo: t('notifications.time.minutesAgo', { count: '{count}' }),
    });

  const restoreTriggerFocus = (event: Event) => {
    const trigger = triggerRefs?.find((ref) => ref.current?.getClientRects().length)?.current;
    if (trigger) {
      event.preventDefault();
      trigger.focus();
    }
  };

  const content = (
    <>
      <div className={`shrink-0 border-b px-4 pb-4 sm:px-6 ${surface.borderClassName}`}>
        <div
          role="tablist"
          className="flex flex-wrap gap-2"
          aria-label={t('notifications.title')}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 'notifications'
                : event.key === 'End'
                  ? 'updates'
                  : section === 'updates'
                    ? 'notifications'
                    : 'updates';
            setSection(next);
            const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
            tabs[next === 'updates' ? 1 : 0]?.focus();
          }}
        >
          {(['notifications', 'updates'] as const).map((value) => (
            <InteractivePill
              key={value}
              active={section === value}
              size="small"
              role="tab"
              id={`${tabsId}-${value}-tab`}
              aria-controls={`${tabsId}-${value}-panel`}
              aria-selected={section === value}
              tabIndex={section === value ? 0 : -1}
              onClick={() => setSection(value)}
            >
              {t(
                value === 'updates'
                  ? 'notifications.section.updates'
                  : 'notifications.section.notifications'
              )}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${sharedSurface.subtleBg}`}
              >
                {value === 'updates' ? updates.length : messages.length}
              </span>
            </InteractivePill>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" key={section}>
        <div
          role="tabpanel"
          id={`${tabsId}-${section}-panel`}
          aria-labelledby={`${tabsId}-${section}-tab`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Tab panels must be keyboard reachable for reading and scrolling.
          tabIndex={0}
          className="min-h-full outline-offset-[-2px]"
        >
          {visible.length === 0 ? (
            <NotificationEmptyState updates={section === 'updates'} />
          ) : (
            <NotificationSection
              title={t(
                section === 'updates'
                  ? 'notifications.section.updates'
                  : 'notifications.section.notifications'
              )}
              notifications={visible}
              onPrimaryAction={runPrimaryAction}
              onDelete={deleteNotification}
              theme={theme}
              primaryColor={primaryColor}
              formatTimestamp={formatRelativeTimestamp}
            />
          )}
        </div>
      </div>
      <footer className={`shrink-0 border-t ${surface.borderClassName}`}>
        <NotificationHeader
          variant="actions"
          onClose={onClose}
          onMarkAllAsRead={unreadCount > 0 ? markAllAsRead : undefined}
          onClearAll={() => setShowClearAllConfirm(true)}
          unreadCount={unreadCount}
          hasNotifications={notifications.length > 0}
          theme={theme}
          primaryColor={primaryColor}
          getColorValue={getColorValue}
          endAction={
            isMobile ? (
              <Button variant="soft" size="small" onClick={onClose}>
                {t('common.done')}
              </Button>
            ) : undefined
          }
        />
      </footer>
    </>
  );

  return (
    <>
      {isMobile ? (
        <SheetSurface
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          title={t('notifications.title')}
          description={t('notifications.title')}
          closeLabel={t('common.close')}
          bodyClassName="!overflow-hidden"
          onCloseAutoFocus={restoreTriggerFocus}
        >
          <SheetSurfaceHeader
            title={t('notifications.title')}
            closeLabel={t('common.close')}
            onClose={onClose}
          />
          {content}
        </SheetSurface>
      ) : (
        <Dialog.Root
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
            <Dialog.Content
              aria-describedby={undefined}
              onCloseAutoFocus={restoreTriggerFocus}
              className={`fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden border shadow-2xl sm:inset-auto sm:right-6 sm:top-6 sm:h-[calc(100dvh-3rem)] sm:max-h-[860px] sm:w-[min(640px,calc(100vw-3rem))] sm:rounded-3xl ${sharedSurface.shellPanel} ${sharedSurface.border} ${sharedSurface.textPrimary}`}
              style={getUiKitGlassSurfaceFoundationStyle(theme)}
            >
              <header className="safe-area-pt-5 flex shrink-0 items-center justify-between gap-3 px-5 pb-3 sm:px-6 sm:pt-5">
                <Dialog.Title className="text-lg font-semibold">
                  {t('notifications.title')}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <IconButton
                    variant="subtle"
                    label={t('common.close')}
                    icon={<X className="h-4 w-4" />}
                  />
                </Dialog.Close>
              </header>
              {content}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notifications.confirmClearAll.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notifications.confirmClearAll.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingAll}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isClearingAll}
              onClick={(event) => {
                event.preventDefault();
                setIsClearingAll(true);
                void clearAll()
                  .then(() => setShowClearAllConfirm(false))
                  .finally(() => setIsClearingAll(false));
              }}
            >
              {t('notifications.confirmClearAll.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface NotificationSectionProps {
  className?: string;
  formatTimestamp: (date: Date) => string;
  notifications: Notification[];
  onDelete: (id: string) => Promise<void>;
  onPrimaryAction: (id: string) => Promise<void>;
  primaryColor: PrimaryColor;
  theme: ThemeType;
  title: string;
}

function NotificationSection({
  className,
  formatTimestamp,
  notifications,
  onDelete,
  onPrimaryAction,
  primaryColor,
  theme,
  title,
}: NotificationSectionProps) {
  const surface = getThemeSurfaceTokens(theme);
  return (
    <section className={className} aria-label={title}>
      <div
        className={`m-4 divide-y overflow-hidden rounded-[24px] border sm:mx-6 ${surface.border} ${surface.divider}`}
      >
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPrimaryAction={onPrimaryAction}
            onDelete={onDelete}
            theme={theme}
            primaryColor={primaryColor}
            formatTimestamp={formatTimestamp}
          />
        ))}
      </div>
    </section>
  );
}
