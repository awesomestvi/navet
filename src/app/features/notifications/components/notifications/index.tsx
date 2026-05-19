import { type RefObject, useEffect, useState } from 'react';
import { SheetSurface } from '@/app/components/primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  type PrimaryColor,
  type ThemeType,
  useClickOutside,
  useI18n,
  useMediaQuery,
  useTheme,
} from '@/app/hooks';
import { NotificationEmptyState } from './notification-empty-state';
import { NotificationHeader } from './notification-header';
import { NotificationItem } from './notification-item';
import { getNotificationSurfaceTokens } from './notification-surface-tokens';
import { formatTimestamp, getColorValue } from './notification-utils';
import { type Notification, useNotifications } from './use-notifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRefs?: Array<RefObject<HTMLElement | null>>;
}

export function NotificationPanel({ isOpen, onClose, triggerRefs = [] }: NotificationPanelProps) {
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const panelRef = useClickOutside<HTMLDivElement>(
    onClose,
    isOpen && !showClearAllConfirm && !isClearingAll && !isMobile,
    triggerRefs
  );
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const surface = getNotificationSurfaceTokens(theme);
  const {
    notifications,
    unreadCount,
    runPrimaryAction,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const updateNotifications = notifications.filter(
    (notification) => notification.source === 'update'
  );
  const regularNotifications = notifications.filter(
    (notification) => notification.source !== 'update'
  );

  useEffect(() => {
    if (!isOpen) {
      setShowClearAllConfirm(false);
      setIsClearingAll(false);
    }
  }, [isOpen]);

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);

    try {
      await clearAll();
      setShowClearAllConfirm(false);
      onClose();
    } finally {
      setIsClearingAll(false);
    }
  };

  const desktopPanelClassName = `absolute right-0 top-0 z-auto flex w-96 max-h-[60vh] flex-col overflow-hidden rounded-2xl ${surface.panelClassName}`;
  const formatRelativeTimestamp = (date: Date) =>
    formatTimestamp(date, {
      daysAgo: t('notifications.time.daysAgo', { count: '{count}' }),
      hoursAgo: t('notifications.time.hoursAgo', { count: '{count}' }),
      justNow: t('notifications.time.justNow'),
      minutesAgo: t('notifications.time.minutesAgo', { count: '{count}' }),
    });
  const content = (
    <>
      <NotificationHeader
        onClose={onClose}
        onMarkAllAsRead={unreadCount > 0 ? markAllAsRead : undefined}
        onClearAll={() => setShowClearAllConfirm(true)}
        unreadCount={unreadCount}
        hasNotifications={notifications.length > 0}
        theme={theme}
        primaryColor={primaryColor}
        getColorValue={getColorValue}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
        {notifications.length === 0 ? (
          <NotificationEmptyState />
        ) : (
          <div className="p-3">
            {updateNotifications.length > 0 ? (
              <NotificationSection
                title={t('notifications.section.updates')}
                notifications={updateNotifications}
                dividerClassName={surface.dividerClassName}
                onPrimaryAction={runPrimaryAction}
                onDelete={deleteNotification}
                theme={theme}
                primaryColor={primaryColor}
                formatTimestamp={formatRelativeTimestamp}
              />
            ) : null}

            {regularNotifications.length > 0 ? (
              <NotificationSection
                title={t('notifications.section.notifications')}
                notifications={regularNotifications}
                dividerClassName={surface.dividerClassName}
                onPrimaryAction={runPrimaryAction}
                onDelete={deleteNotification}
                theme={theme}
                primaryColor={primaryColor}
                formatTimestamp={formatRelativeTimestamp}
                className={updateNotifications.length > 0 ? 'mt-4' : undefined}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );

  if (!isOpen) return null;

  return (
    <>
      {isMobile ? (
        <SheetSurface
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          title={t('notifications.title')}
          description={t('notifications.section.notifications') || t('notifications.title')}
          accentColor={getColorValue(primaryColor)}
          overlayClassName={`animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden ${surface.dialogBackdrop}`}
          contentClassName={surface.sheetClassName}
          bodyClassName="flex max-h-[min(78vh,42rem)] flex-col"
        >
          {content}
        </SheetSurface>
      ) : (
        <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2">
          <div
            ref={panelRef}
            onPointerDown={(e) => e.stopPropagation()}
            className={desktopPanelClassName}
          >
            {content}
          </div>
        </div>
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
              onClick={() => {
                void handleConfirmClearAll();
              }}
              disabled={isClearingAll}
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
  dividerClassName: string;
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
  dividerClassName,
  formatTimestamp,
  notifications,
  onDelete,
  onPrimaryAction,
  primaryColor,
  theme,
  title,
}: NotificationSectionProps) {
  const surface = getNotificationSurfaceTokens(theme);

  return (
    <section className={className}>
      <div className="mb-2 px-1">
        <h4 className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
          {title}
        </h4>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border divide-y ${dividerClassName} ${surface.borderClassName}`}
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
