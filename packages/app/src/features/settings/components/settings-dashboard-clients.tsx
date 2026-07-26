import { Badge, Input } from '@navet/app/components/primitives';
import {
  type DashboardClientKind,
  getDashboardClientIdentity,
  renameDashboardClient,
} from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { DASHBOARD_PROFILE_REFRESH_EVENT } from '@navet/app/features/dashboard/hooks/use-dashboard-profile-sync';
import { useI18n } from '@navet/app/hooks';
import type {
  DashboardProfileHistoryEntry,
  DashboardProfileRevisionMetadata,
} from '@navet/app/services/dashboard-profile.contract';
import { DASHBOARD_PROFILE_HISTORY_LIMIT } from '@navet/app/services/dashboard-profile.contract';
import {
  forgetDashboardProfileClient,
  loadDashboardProfileHistory,
  restoreDashboardProfileRevision,
} from '@navet/app/services/dashboard-profile.service';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  History,
  Laptop,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';

function DashboardClientIcon({
  className,
  kind,
}: {
  className?: string;
  kind: DashboardClientKind;
}) {
  if (kind === 'phone') {
    return <Smartphone className={className} />;
  }
  if (kind === 'tablet') {
    return <Tablet className={className} />;
  }
  if (kind === 'wall_panel') {
    return <Monitor className={className} />;
  }
  return <Laptop className={className} />;
}

function formatLastSeen(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const elapsedMs = timestamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const elapsedMinutes = Math.round(elapsedMs / 60_000);
  if (Math.abs(elapsedMinutes) < 60) {
    return formatter.format(elapsedMinutes, 'minute');
  }
  const elapsedHours = Math.round(elapsedMs / 3_600_000);
  if (Math.abs(elapsedHours) < 24) {
    return formatter.format(elapsedHours, 'hour');
  }
  return formatter.format(Math.round(elapsedMs / 86_400_000), 'day');
}

function getStatusTranslationKey(
  status: ReturnType<typeof useDashboardProfileRuntimeStore.getState>['status']
) {
  return `settings.system.clients.status.${status}` as const;
}

function toRuntimeActivity(metadata: DashboardProfileRevisionMetadata) {
  return {
    id: `${metadata.workspaceId}:${metadata.revision}`,
    revision: metadata.revision,
    changedAt: metadata.updatedAt,
    changedPaths: metadata.changedPaths,
    actor: {
      clientId: metadata.author.id,
      clientName: metadata.author.name,
      clientKind: metadata.author.kind,
      ...(metadata.author.userId ? { userId: metadata.author.userId } : {}),
      ...(metadata.author.userName ? { userName: metadata.author.userName } : {}),
    },
  };
}

export function SettingsDashboardClients({
  styles,
}: {
  styles: SettingsSectionController['styles'];
}) {
  const { t } = useI18n();
  const dashboardProfileMode = useSettingsStore((state) => state.dashboardProfileMode);
  const {
    client,
    clients,
    error,
    lastActivity,
    lastSyncedAt,
    revision: currentRuntimeRevision,
    setClient,
    setClients,
    status,
  } = useDashboardProfileRuntimeStore(
    useShallow((state) => ({
      client: state.client,
      clients: state.clients,
      error: state.error,
      lastActivity: state.lastActivity,
      lastSyncedAt: state.lastSyncedAt,
      revision: state.revision,
      setClient: state.setClient,
      setClients: state.setClients,
      status: state.status,
    }))
  );
  const resolvedClient = useMemo(
    () => client ?? getDashboardClientIdentity({ profileMode: dashboardProfileMode }),
    [client, dashboardProfileMode]
  );
  const [clientName, setClientName] = useState(resolvedClient.name);
  const [editingClientName, setEditingClientName] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<DashboardProfileHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringRevision, setRestoringRevision] = useState<number | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState<number | null>(null);
  const [forgetConfirmation, setForgetConfirmation] = useState<string | null>(null);
  const [forgettingClientId, setForgettingClientId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const otherClients = clients.filter(({ id }) => id !== resolvedClient.id);
  const hasNameChange = clientName.trim() !== resolvedClient.name;

  useEffect(() => {
    setClient(resolvedClient);
  }, [resolvedClient, setClient]);

  useEffect(() => {
    setClientName(resolvedClient.name);
  }, [resolvedClient.name]);

  const saveClientName = () => {
    const nextClient = renameDashboardClient(clientName, {
      profileMode: dashboardProfileMode,
    });
    setClient(nextClient);
    setClientName(nextClient.name);
    setEditingClientName(false);
  };

  const cancelClientNameEdit = () => {
    setClientName(resolvedClient.name);
    setEditingClientName(false);
  };

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const history = await loadDashboardProfileHistory();
      if (!history) {
        setHistoryError(t('settings.system.clients.historyLoadFailed'));
        return;
      }
      setHistoryEntries(history.entries.slice(0, DASHBOARD_PROFILE_HISTORY_LIMIT));
    } catch {
      setHistoryError(t('settings.system.clients.historyLoadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  const toggleHistory = () => {
    const nextOpen = !historyOpen;
    setHistoryOpen(nextOpen);
    if (nextOpen && historyEntries === null && !historyLoading) {
      void refreshHistory();
    }
  };

  const restoreRevision = async (revisionToRestore: number) => {
    if (currentRuntimeRevision === null || restoringRevision !== null) {
      return;
    }

    setRestoringRevision(revisionToRestore);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await restoreDashboardProfileRevision(revisionToRestore, {
        author: resolvedClient,
        baseRevision: currentRuntimeRevision,
      });

      if (!result.saved) {
        const stale = result.preconditionFailed || result.preconditionRequired;
        setActionError(
          stale
            ? t('settings.system.clients.restoreStale')
            : t('settings.system.clients.restoreFailed')
        );
        if (stale) {
          setRestoreConfirmation(null);
          window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
          await refreshHistory();
        }
        return;
      }

      useDashboardProfileRuntimeStore.getState().markSynced({
        ...(result.metadata ? { activity: toRuntimeActivity(result.metadata) } : {}),
        revision: result.revision ?? currentRuntimeRevision,
        workspaceId: result.workspace?.workspaceId ?? undefined,
      });
      setRestoreConfirmation(null);
      setActionMessage(
        t('settings.system.clients.restoreSuccess', {
          revision: revisionToRestore,
        })
      );
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
      await refreshHistory();
    } catch {
      setActionError(t('settings.system.clients.restoreFailed'));
    } finally {
      setRestoringRevision(null);
    }
  };

  const forgetClient = async (clientId: string) => {
    if (
      clientId === resolvedClient.id ||
      forgettingClientId !== null ||
      !otherClients.some(({ id }) => id === clientId)
    ) {
      return;
    }

    const clientToForget = otherClients.find(({ id }) => id === clientId);
    setForgettingClientId(clientId);
    setActionError(null);
    setActionMessage(null);

    try {
      const forgotten = await forgetDashboardProfileClient(clientId);
      if (!forgotten) {
        setActionError(t('settings.system.clients.forgetFailed'));
        return;
      }

      setClients(
        useDashboardProfileRuntimeStore.getState().clients.filter(({ id }) => id !== clientId)
      );
      setForgetConfirmation(null);
      setActionMessage(
        t('settings.system.clients.forgetSuccess', {
          client: clientToForget?.name ?? '',
        })
      );
    } catch {
      setActionError(t('settings.system.clients.forgetFailed'));
    } finally {
      setForgettingClientId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="py-1">
        <div className="flex min-w-0 items-start gap-3">
          <DashboardClientIcon
            kind={resolvedClient.kind}
            className={`mt-1 h-4.5 w-4.5 shrink-0 ${styles.mutedColor}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                {resolvedClient.name}
              </p>
              <Badge
                tone={status === 'error' ? 'danger' : status === 'synced' ? 'success' : 'neutral'}
                className="text-[10px]"
              >
                {t(getStatusTranslationKey(status))}
              </Badge>
            </div>
            <div
              className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${styles.subtleColor}`}
            >
              <span>{t('settings.system.clients.thisDashboard')}</span>
              {currentRuntimeRevision !== null ? (
                <span>
                  {t('settings.system.clients.revision', {
                    revision: currentRuntimeRevision,
                  })}
                </span>
              ) : null}
              {lastSyncedAt ? (
                <span>
                  {t('settings.system.clients.lastSynced', {
                    time: formatLastSeen(lastSyncedAt),
                  })}
                </span>
              ) : null}
            </div>
          </div>
          {!editingClientName ? (
            <button
              type="button"
              aria-controls="dashboard-client-name-editor"
              aria-expanded={false}
              onClick={() => {
                setClientName(resolvedClient.name);
                setEditingClientName(true);
              }}
              className={`relative inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${styles.borderColor} ${styles.hoverBg} ${styles.mutedColor}`}
            >
              {t('settings.system.clients.rename')}
            </button>
          ) : null}
        </div>

        {editingClientName ? (
          <form
            id="dashboard-client-name-editor"
            className={`ml-7 mt-3 border-l-2 pl-4 ${styles.dividerColor}`}
            onSubmit={(event) => {
              event.preventDefault();
              if (hasNameChange && clientName.trim()) {
                saveClientName();
              }
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                autoFocus
                aria-label={t('settings.system.clients.name')}
                value={clientName}
                maxLength={64}
                onChange={(event) => setClientName(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelClientNameEdit();
                  }
                }}
                containerClassName="min-w-0 flex-1"
                inputClassName={styles.textColor}
              />
              <div className="flex gap-2 sm:contents">
                <button
                  type="submit"
                  disabled={!hasNameChange || !clientName.trim()}
                  className={`inline-flex h-11 flex-1 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                >
                  {t('settings.system.clients.saveName')}
                </button>
                <button
                  type="button"
                  onClick={cancelClientNameEdit}
                  className={`inline-flex h-11 flex-1 shrink-0 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors sm:flex-none ${styles.hoverBg} ${styles.mutedColor}`}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="ml-7 mt-3 flex items-start gap-2 text-sm leading-6 text-red-400">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {lastActivity && lastActivity.actor.clientId !== resolvedClient.id ? (
        <div className={`border-l-2 pl-4 ${styles.dividerColor}`}>
          <p className={`text-sm font-medium ${styles.textColor}`}>
            {t('settings.system.clients.updatedBy', {
              client: lastActivity.actor.clientName,
            })}
          </p>
          <p className={`mt-1 text-sm leading-6 ${styles.subtleColor}`}>
            {t('settings.system.clients.changedPaths', {
              count: lastActivity.changedPaths.length,
              revision: lastActivity.revision,
              time: formatLastSeen(lastActivity.changedAt),
            })}
          </p>
        </div>
      ) : null}

      {otherClients.length > 0 ? (
        <div className={`border-t pt-4 ${styles.dividerColor}`}>
          <p className={`text-sm font-medium ${styles.textColor}`}>
            {t('settings.system.clients.otherDashboards')}
          </p>
          <div className={`mt-2 divide-y ${styles.dividerColor}`}>
            {otherClients.map((registeredClient) => {
              const confirmingForget = forgetConfirmation === registeredClient.id;
              const forgetting = forgettingClientId === registeredClient.id;

              return (
                <div key={registeredClient.id} className="py-3 first:pt-1 last:pb-1">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <DashboardClientIcon
                        kind={registeredClient.kind}
                        className={`h-4.5 w-4.5 shrink-0 ${styles.mutedColor}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                          {registeredClient.name}
                        </p>
                        <p className={`mt-0.5 truncate text-xs ${styles.subtleColor}`}>
                          {registeredClient.userName
                            ? t('settings.system.clients.signedInAs', {
                                name: registeredClient.userName,
                              })
                            : t('settings.system.clients.identityUnknown')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 pl-7 sm:justify-end sm:pl-0">
                      <div
                        className={`shrink-0 text-left text-xs sm:text-right ${styles.subtleColor}`}
                      >
                        <p>{formatLastSeen(registeredClient.lastSeenAt)}</p>
                        {registeredClient.lastRevision !== null ? (
                          <p className="mt-0.5">
                            {t('settings.system.clients.revision', {
                              revision: registeredClient.lastRevision,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={forgettingClientId !== null}
                        onClick={() => {
                          setForgetConfirmation(registeredClient.id);
                          setRestoreConfirmation(null);
                          setActionError(null);
                          setActionMessage(null);
                        }}
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-3.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('settings.system.clients.forget')}
                      </button>
                    </div>
                  </div>

                  {confirmingForget ? (
                    <fieldset
                      className={`ml-7 mt-3 min-w-0 border-0 border-l-2 pl-4 ${styles.dividerColor}`}
                      aria-label={t('settings.system.clients.forgetConfirm', {
                        client: registeredClient.name,
                      })}
                    >
                      <p className={`text-sm font-medium ${styles.textColor}`}>
                        {t('settings.system.clients.forgetConfirm', {
                          client: registeredClient.name,
                        })}
                      </p>
                      <p className={`mt-1 text-sm leading-6 ${styles.subtleColor}`}>
                        {t('settings.system.clients.forgetDescription')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={forgetting}
                          onClick={() => setForgetConfirmation(null)}
                          className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={forgetting}
                          onClick={() => void forgetClient(registeredClient.id)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-4 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 className="h-4 w-4" />
                          {forgetting
                            ? t('settings.system.clients.forgetting')
                            : t('settings.system.clients.forget')}
                        </button>
                      </div>
                    </fieldset>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {status !== 'disabled' ? (
        <div className={`border-t pt-4 ${styles.dividerColor}`}>
          <button
            type="button"
            aria-expanded={historyOpen}
            onClick={toggleHistory}
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
          >
            <History className="h-4 w-4" />
            {historyOpen
              ? t('settings.system.clients.hideHistory')
              : t('settings.system.clients.showHistory')}
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {historyOpen ? (
            <div className="mt-4">
              {historyLoading && historyEntries === null ? (
                <p className={`text-sm leading-6 ${styles.subtleColor}`}>
                  {t('settings.system.clients.historyLoading')}
                </p>
              ) : historyError ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm leading-6 text-red-400">{historyError}</p>
                  <button
                    type="button"
                    onClick={() => void refreshHistory()}
                    className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                  >
                    {t('settings.system.clients.historyRetry')}
                  </button>
                </div>
              ) : historyEntries?.length ? (
                <section
                  aria-label={t('settings.system.clients.showHistory')}
                  data-card-nodrag="true"
                  data-testid="revision-history-scroll"
                  className={`max-h-[min(22rem,55vh)] touch-pan-y overflow-y-auto overscroll-contain rounded-[18px] border [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] ${styles.insetBorderColor} ${styles.insetBg}`}
                >
                  <div className={`divide-y ${styles.dividerColor}`}>
                    {historyEntries.map((entry) => {
                      const isCurrent = entry.revision === currentRuntimeRevision;
                      const confirmingRestore = restoreConfirmation === entry.revision;
                      const restoring = restoringRevision === entry.revision;

                      return (
                        <div
                          key={entry.revision}
                          className="p-3 [contain-intrinsic-block-size:4.5rem] [content-visibility:auto]"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-sm font-medium ${styles.textColor}`}>
                                  {t('settings.system.clients.revision', {
                                    revision: entry.revision,
                                  })}
                                </p>
                                {isCurrent ? (
                                  <Badge tone="success" className="text-[10px]">
                                    {t('settings.system.clients.historyCurrent')}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className={`mt-0.5 text-xs leading-5 ${styles.subtleColor}`}>
                                {t('settings.system.clients.historyUpdatedBy', {
                                  client: entry.author.name,
                                  time: formatLastSeen(entry.updatedAt),
                                })}
                              </p>
                              {entry.restoredFromRevision !== undefined ? (
                                <p className={`text-xs leading-5 ${styles.subtleColor}`}>
                                  {t('settings.system.clients.historyRestoredFrom', {
                                    revision: entry.restoredFromRevision,
                                  })}
                                </p>
                              ) : !entry.hasProfile ? (
                                <p className={`text-xs leading-5 ${styles.subtleColor}`}>
                                  {t('settings.system.clients.historySnapshotUnavailable')}
                                </p>
                              ) : null}
                            </div>

                            {!isCurrent && entry.hasProfile ? (
                              <button
                                type="button"
                                disabled={
                                  restoringRevision !== null || currentRuntimeRevision === null
                                }
                                onClick={() => {
                                  setRestoreConfirmation(entry.revision);
                                  setForgetConfirmation(null);
                                  setActionError(null);
                                  setActionMessage(null);
                                }}
                                className={`relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] disabled:cursor-not-allowed disabled:opacity-45 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                {t('settings.system.clients.restore')}
                              </button>
                            ) : null}
                          </div>

                          {confirmingRestore ? (
                            <fieldset
                              className={`mt-2 min-w-0 border-0 border-l-2 pl-3 ${styles.dividerColor}`}
                              aria-label={t('settings.system.clients.restoreConfirm', {
                                revision: entry.revision,
                              })}
                            >
                              <p className={`text-xs font-medium ${styles.textColor}`}>
                                {t('settings.system.clients.restoreConfirm', {
                                  revision: entry.revision,
                                })}
                              </p>
                              <p className={`mt-0.5 text-xs leading-5 ${styles.subtleColor}`}>
                                {t('settings.system.clients.restoreDescription')}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={restoring}
                                  onClick={() => setRestoreConfirmation(null)}
                                  className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                                >
                                  {t('common.cancel')}
                                </button>
                                <button
                                  type="button"
                                  disabled={restoring}
                                  onClick={() => void restoreRevision(entry.revision)}
                                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  {restoring
                                    ? t('settings.system.clients.restoring')
                                    : t('settings.system.clients.restore')}
                                </button>
                              </div>
                            </fieldset>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <p className={`text-sm leading-6 ${styles.subtleColor}`}>
                  {t('settings.system.clients.historyEmpty')}
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite">
        {actionError ? (
          <div className="flex items-start gap-2 text-sm leading-6 text-red-400">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        ) : actionMessage ? (
          <p className={`text-sm leading-6 ${styles.subtleColor}`}>{actionMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
