import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/app/components/primitives/button';
import { type PrimaryColor, type ThemeType, useI18n } from '@/app/hooks';
import { getNotificationSurfaceTokens } from './notification-surface-tokens';

interface NotificationHeaderProps {
  onClose: () => void;
  onMarkAllAsRead?: () => void;
  onClearAll: () => void;
  unreadCount: number;
  hasNotifications: boolean;
  theme: ThemeType;
  primaryColor: PrimaryColor;
  getColorValue: (color: PrimaryColor) => string;
}

export function NotificationHeader({
  onClose,
  onMarkAllAsRead,
  onClearAll,
  unreadCount,
  hasNotifications,
  theme,
  primaryColor,
  getColorValue,
}: NotificationHeaderProps) {
  const { t } = useI18n();
  const surface = getNotificationSurfaceTokens(theme);

  return (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between border-b p-4 ${surface.borderClassName}`}>
        <div className="flex items-center gap-2.5">
          <Bell className={`h-4 w-4 ${surface.textSecondary}`} />
          <h3 className={`text-sm font-semibold ${surface.textPrimary}`}>
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: getColorValue(primaryColor) }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`rounded-lg p-1.5 transition-colors ${surface.hoverClassName}`}
        >
          <X className={`h-4 w-4 ${surface.textSecondary}`} />
        </button>
      </div>

      {/* Actions */}
      {hasNotifications && (
        <div
          className={`flex items-center gap-2.5 border-b px-3 py-2.5 ${surface.borderClassName}`}
        >
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              onClick={onMarkAllAsRead}
              variant="secondary"
              size="small"
              leading={<Check className="h-3.5 w-3.5" />}
              className="min-h-8 justify-start rounded-full px-3 text-xs"
            >
              {t('notifications.header.markAllRead')}
            </Button>
          )}
          <Button
            onClick={onClearAll}
            variant="secondary"
            size="small"
            leading={<Trash2 className="h-3.5 w-3.5" />}
            className="min-h-8 justify-start rounded-full px-3 text-xs"
          >
            {t('notifications.header.clearAll')}
          </Button>
        </div>
      )}
    </>
  );
}
