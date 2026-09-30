import { Button } from '@navet/app/components/primitives/button';
import { type PrimaryColor, type ThemeType, useI18n } from '@navet/app/hooks';
import { Bell, Check, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
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
  variant?: 'full' | 'actions';
  endAction?: ReactNode;
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
  variant = 'full',
  endAction,
}: NotificationHeaderProps) {
  const { t } = useI18n();
  const surface = getNotificationSurfaceTokens(theme);

  const actions =
    hasNotifications || endAction ? (
      <div className={`flex flex-wrap items-center gap-2.5 px-4 py-3 ${surface.borderClassName}`}>
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button
            onClick={onMarkAllAsRead}
            variant="secondary"
            size="small"
            leading={<Check className="h-3 w-3" />}
            className="min-h-9 justify-start rounded-full px-3 text-xs"
          >
            {t('notifications.header.markAllRead')}
          </Button>
        )}
        {hasNotifications ? (
          <Button
            onClick={onClearAll}
            variant="secondary"
            size="small"
            leading={<Trash2 className="h-3 w-3" />}
            className="min-h-9 justify-start rounded-full px-3 text-xs"
          >
            {t('notifications.header.clearAll')}
          </Button>
        ) : null}
        {endAction ? <div className="ml-auto">{endAction}</div> : null}
      </div>
    ) : null;

  if (variant === 'actions') {
    return actions;
  }

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
          aria-label={t('common.close')}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${surface.hoverClassName}`}
        >
          <X className={`h-4 w-4 ${surface.textSecondary}`} />
        </button>
      </div>

      {/* Actions */}
      {actions}
    </>
  );
}
