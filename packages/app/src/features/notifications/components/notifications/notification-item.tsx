import { useAuthBaseUrl } from '@navet/app/auth/AuthProvider';
import { Button } from '@navet/app/components/primitives/button';
import { IconButton } from '@navet/app/components/primitives/icon-button';
import { Link } from '@navet/app/components/primitives/link';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { type PrimaryColor, type ThemeType, useI18n } from '@navet/app/hooks';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import { ArrowRight, Check, ChevronDown, Download, RotateCw, X } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
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

function NotificationItemHeading({
  id,
  title,
  metadata,
  theme,
}: {
  id: string;
  title: string;
  metadata: ReactNode;
  theme: ThemeType;
}) {
  const surface = getNotificationSurfaceTokens(theme);
  return (
    <div className="min-w-0 pt-0.5">
      <h3
        id={id}
        className={`text-sm font-medium leading-5 [overflow-wrap:anywhere] ${surface.textPrimary}`}
      >
        {title}
      </h3>
      <div className={`mt-0.5 text-xs leading-4 [overflow-wrap:anywhere] ${surface.textMuted}`}>
        {metadata}
      </div>
    </div>
  );
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
  const baseUrl = useAuthBaseUrl();
  const titleId = useId();
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const surface = getNotificationSurfaceTokens(theme);
  const sharedSurface = getThemeSurfaceTokens(theme);
  const isUpdate = notification.source === 'update';
  const busy = Boolean(isUpdate && notification.isBusy && !notification.requiresRestart);
  const Icon = isUpdate ? Download : getNotificationIcon(notification.type);
  const accent = getNotificationColor(isUpdate ? 'info' : notification.type, primaryColor);
  const actionLabel = isUpdate
    ? notification.requiresRestart
      ? t('notifications.action.restart')
      : t('notifications.action.update')
    : t('notifications.action.markAsRead');
  const dismissLabel = isUpdate ? t('notifications.action.hide') : t('notifications.action.delete');
  const detailsUrl = notification.detailsUrl
    ? sanitizeExternalUrl(notification.detailsUrl, baseUrl ?? undefined)
    : null;
  const paragraphs = notification.message.split(/\n\s*\n/);
  const expandable = paragraphs.length > 1 || notification.message.length > 220;
  const summary =
    isUpdate && notification.latestVersion
      ? notification.installedVersion
        ? t('notifications.update.availableFromTo', {
            from: notification.installedVersion,
            to: notification.latestVersion,
          })
        : t('notifications.update.availableTo', { version: notification.latestVersion })
      : paragraphs[0];
  const details =
    isUpdate && paragraphs.length > 1 ? paragraphs.slice(1).join('\n\n') : notification.message;
  const updateDetails = paragraphs.length > 1 ? paragraphs.slice(1).join('\n\n').trim() : '';
  const longUpdateDetails =
    updateDetails.length > 220 || updateDetails.split('\n').filter(Boolean).length > 3;
  const updatePreview = longUpdateDetails
    ? `${updateDetails.split('\n').slice(0, 3).join('\n').slice(0, 220).trimEnd()}…`
    : updateDetails;
  const perform = async (action: (id: string) => Promise<void>) => {
    setPending(true);
    setFailed(false);
    try {
      await action(notification.id);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  if (isUpdate) {
    return (
      <article aria-labelledby={titleId} className="min-h-14 px-4 py-3">
        <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-x-3">
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${sharedSurface.borderStrong} ${sharedSurface.iconBg}`}
            style={{ color: accent }}
          >
            {notification.requiresRestart ? (
              <RotateCw className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <NotificationItemHeading
              id={titleId}
              title={notification.title}
              theme={theme}
              metadata={
                notification.latestVersion ? (
                  <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 tabular-nums [overflow-wrap:anywhere]">
                    <span className="sr-only">{summary}</span>
                    {notification.installedVersion && (
                      <>
                        <span aria-hidden="true" className={surface.textMuted}>
                          {notification.installedVersion}
                        </span>
                        <ArrowRight aria-hidden="true" className="h-3 w-3 shrink-0" />
                      </>
                    )}
                    <span aria-hidden="true" className="font-medium">
                      {notification.latestVersion}
                    </span>
                  </span>
                ) : (
                  <span className="[overflow-wrap:anywhere]">{summary}</span>
                )
              }
            />
          </div>
          <Button
            variant="secondary"
            size="small"
            className="col-start-3 row-start-1 shrink-0 whitespace-nowrap"
            loading={pending || busy}
            disabled={pending || busy}
            onClick={() => void perform(onPrimaryAction)}
          >
            {busy ? t('notifications.update.installing') : actionLabel}
          </Button>
          <div className="col-start-2 col-end-[-1] row-start-2 min-w-0">
            {(busy || (notification.requiresRestart && notification.statusLabel)) && (
              <div className="mt-2 space-y-1.5">
                {notification.statusLabel && (
                  <p role="status" className={`text-xs ${surface.textSecondary}`}>
                    {notification.statusLabel}
                  </p>
                )}
                {busy && (
                  <progress
                    aria-label={notification.statusLabel || t('notifications.update.installing')}
                    max={100}
                    value={notification.progress ?? undefined}
                    className="block h-1 w-full"
                    style={{ accentColor: accent }}
                  />
                )}
              </div>
            )}
            {failed && (
              <p role="alert" className="mt-2 text-sm text-red-500">
                {t('notifications.action.failed')}
              </p>
            )}
            {updateDetails && (
              <div className="mt-2">
                <div
                  id={detailsId}
                  className={`space-y-2 text-sm leading-relaxed [overflow-wrap:anywhere] ${surface.textSecondary}`}
                >
                  {renderNotificationMarkdown(
                    detailsOpen ? updateDetails : updatePreview,
                    baseUrl ?? undefined,
                    t('notifications.imageAlt')
                  )}
                </div>
                {longUpdateDetails && (
                  <Button
                    variant="ghost"
                    size="small"
                    className="mt-1 -ml-3"
                    aria-expanded={detailsOpen}
                    aria-controls={detailsId}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    {t(
                      detailsOpen
                        ? 'notifications.action.showLess'
                        : 'notifications.action.readMore'
                    )}
                  </Button>
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {detailsUrl && (
                <Link
                  href={detailsUrl}
                  target="_blank"
                  size="small"
                  appearance="subtle"
                  showExternalIcon
                >
                  {t('notifications.action.viewChanges')}
                </Link>
              )}
              <Button
                variant="ghost"
                size="small"
                className="px-2"
                disabled={pending || busy}
                onClick={() => void perform(onDelete)}
              >
                {dismissLabel}
              </Button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article aria-labelledby={titleId} className="min-h-14 px-4 py-3">
      <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3">
        <span
          aria-hidden="true"
          className={`relative mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border ${sharedSurface.borderStrong} ${sharedSurface.iconBg}`}
          style={{ color: accent }}
        >
          <Icon className="h-4 w-4" />
          {!notification.read && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <NotificationItemHeading
              id={titleId}
              title={notification.title}
              theme={theme}
              metadata={
                <time dateTime={notification.timestamp.toISOString()}>
                  {formatTimestamp(notification.timestamp)}
                </time>
              }
            />
            <div className="-mt-1 flex shrink-0">
              {!notification.read && (
                <IconButton
                  variant="ghost"
                  size="small"
                  label={`${actionLabel}: ${notification.title}`}
                  title={actionLabel}
                  disabled={pending}
                  onClick={() => void perform(onPrimaryAction)}
                  icon={<Check className="h-4 w-4" />}
                />
              )}
              <IconButton
                variant="ghost"
                size="small"
                label={`${dismissLabel}: ${notification.title}`}
                title={dismissLabel}
                disabled={pending || busy}
                onClick={() => void perform(onDelete)}
                icon={<X className="h-4 w-4" />}
              />
            </div>
          </div>
          <div
            className={`mt-2 text-sm leading-relaxed [overflow-wrap:anywhere] ${surface.textSecondary}`}
          >
            {expandable ? (
              <p className="line-clamp-2">{summary}</p>
            ) : (
              renderNotificationMarkdown(summary, baseUrl ?? undefined, t('notifications.imageAlt'))
            )}
          </div>
          {expandable && (
            <Button
              className="mt-3"
              variant="ghost"
              size="small"
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((open) => !open)}
              leading={
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${detailsOpen ? 'rotate-180' : ''}`}
                />
              }
            >
              {t('notifications.action.details')}
            </Button>
          )}
          {failed && (
            <p role="alert" className="mt-2 text-sm text-red-500">
              {t('notifications.action.failed')}
            </p>
          )}
          {expandable && (
            <div
              id={detailsId}
              hidden={!detailsOpen}
              className={`mt-3 space-y-3 rounded-xl p-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${surface.textSecondary} ${sharedSurface.subtleBg}`}
            >
              {renderNotificationMarkdown(
                details,
                baseUrl ?? undefined,
                t('notifications.imageAlt')
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
