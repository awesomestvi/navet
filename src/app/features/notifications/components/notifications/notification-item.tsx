import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useAuth } from '@/app/contexts/auth-context';
import { type PrimaryColor, type ThemeType, useI18n } from '@/app/hooks';
import { authSelectors } from '@/app/stores/selectors';
import { getNotificationSurfaceTokens } from './notification-surface-tokens';
import {
  getNotificationColor,
  getNotificationIcon,
  renderNotificationMarkdown,
} from './notification-utils';
import type { Notification } from './use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onPrimaryAction: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  theme: ThemeType;
  primaryColor: PrimaryColor;
  formatTimestamp: (date: Date) => string;
}

export function NotificationItem({
  notification,
  onPrimaryAction,
  onDelete,
  theme,
  primaryColor,
  formatTimestamp,
}: NotificationItemProps) {
  const { t } = useI18n();
  const config = useAuth(authSelectors.config);
  const surface = getNotificationSurfaceTokens(theme);
  const NotificationIcon = getNotificationIcon(notification.type);
  const primaryActionLabel =
    notification.source === 'update'
      ? notification.requiresRestart
        ? t('notifications.action.restart')
        : t('notifications.action.update')
      : t('notifications.action.markAsRead');
  const secondaryActionLabel =
    notification.source === 'update'
      ? t('notifications.action.hide')
      : t('notifications.action.delete');
  const accentColor = getNotificationColor(notification.type, primaryColor);
  const unreadIndicatorColor = getThemeColorValue(primaryColor);
  const iconToneClassName =
    notification.type === 'success'
      ? theme === 'light'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
        : theme === 'black'
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
      : notification.type === 'error'
        ? theme === 'light'
          ? 'border-red-200 bg-red-50 text-red-600'
          : theme === 'black'
            ? 'border-red-400/40 bg-red-400/10 text-red-300'
            : 'border-red-400/20 bg-red-500/10 text-red-300'
        : theme === 'light'
          ? 'border-amber-200 bg-amber-50 text-amber-600'
          : theme === 'black'
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            : 'border-amber-400/20 bg-amber-500/10 text-amber-300';

  return (
    <div
      className={`group relative p-4 transition-all ${surface.hoverClassName} ${!notification.read ? surface.unreadItemClassName : ''}`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border ${iconToneClassName}`}
        >
          <NotificationIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex min-w-0 items-center gap-2">
              {!notification.read && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: unreadIndicatorColor }}
                />
              )}
              <h4 className={`min-w-0 text-sm font-medium ${surface.textPrimary}`}>
                {notification.title}
              </h4>
            </div>
            <span className={`shrink-0 text-xs ${surface.textMuted}`}>
              {formatTimestamp(notification.timestamp)}
            </span>
          </div>
          <div className={`mb-2 space-y-2 text-xs leading-relaxed ${surface.textSecondary}`}>
            {renderNotificationMarkdown(
              notification.message,
              config?.url,
              t('notifications.imageAlt')
            )}
          </div>

          {notification.source === 'update' &&
          notification.isBusy &&
          !notification.requiresRestart ? (
            <div className="mt-2 space-y-2">
              <div className={`text-[11px] font-medium ${surface.textSecondary}`}>
                {notification.statusLabel}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${notification.progress ?? 12}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {notification.source === 'update' && notification.statusLabel && (
                <span className={`mr-1 text-[11px] font-medium ${surface.textSecondary}`}>
                  {notification.statusLabel}
                </span>
              )}
              {(notification.source === 'update' || !notification.read) && (
                <InteractivePill
                  onClick={() => void onPrimaryAction(notification.id)}
                  active={notification.source === 'update'}
                  intent="action"
                  className="h-7 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium"
                >
                  {primaryActionLabel}
                </InteractivePill>
              )}
              <InteractivePill
                onClick={() => void onDelete(notification.id)}
                intent="action"
                className="h-7 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium"
              >
                {secondaryActionLabel}
              </InteractivePill>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
