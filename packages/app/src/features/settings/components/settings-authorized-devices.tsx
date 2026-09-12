import {
  type AuthorizedDevice,
  approveDeviceAuthorization,
  type DeviceAuthorizationPreview,
  declineDeviceAuthorization,
  listAuthorizedDevices,
  previewDeviceAuthorization,
  promoteAuthorizedDevice,
  renameAuthorizedDevice,
  revokeAuthorizedDevice,
} from '@navet/app/auth/device-authorization';
import { formatOneTimeCode } from '@navet/app/auth/one-time-code';
import { Badge, Button, Input } from '@navet/app/components/primitives';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { getCurrentDevicePairingPreferences } from '@navet/app/features/auth/device-pairing-preferences';
import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import type { SettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useI18n } from '@navet/app/i18n';
import {
  Check,
  KeyRound,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

function getRelativeActivity(value: number) {
  const elapsedMs = value - Date.now();
  const elapsedMinutes = Math.round(elapsedMs / 60_000);
  if (Math.abs(elapsedMinutes) < 60) return { value: elapsedMinutes, unit: 'minute' as const };
  const elapsedHours = Math.round(elapsedMs / 3_600_000);
  if (Math.abs(elapsedHours) < 24) return { value: elapsedHours, unit: 'hour' as const };
  return { value: Math.round(elapsedMs / 86_400_000), unit: 'day' as const };
}

function formatProvider(provider: string) {
  if (provider === 'home_assistant') return 'Home Assistant';
  if (provider === 'openhab') return 'openHAB';
  if (provider === 'homey') return 'Homey';
  return provider;
}

export function SettingsAuthorizedDevices({ styles }: { styles: SettingsSectionStyles }) {
  const { formatRelativeTime, t } = useI18n();
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [access, setAccess] = useState<'primary' | 'authorized' | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingPreview, setPendingPreview] = useState<DeviceAuthorizationPreview | null>(null);
  const [deviceToPromote, setDeviceToPromote] = useState<AuthorizedDevice | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<AuthorizedDevice | null>(null);
  const [dashboardClient] = useState(() => getDashboardClientIdentity());
  const approvalSyncGeneration = useRef(0);
  const primaryDeviceCount = devices.filter((device) => device.role === 'primary').length;
  const needsPrimarySelection = access === 'primary' && primaryDeviceCount > 1;

  const formatDeviceActivity = (device: AuthorizedDevice) => {
    const providers = device.providers.map(formatProvider).join(', ');
    if (device.id === currentDeviceId) return `${providers} · ${t('sidebar.current')}`;

    const relativeActivity = getRelativeActivity(device.lastActivityAt);
    if (relativeActivity.value === 0) {
      return t('settings.system.authorizedDevices.activityNow', { providers });
    }

    return t('settings.system.authorizedDevices.activity', {
      providers,
      time: formatRelativeTime(relativeActivity.value, relativeActivity.unit),
    });
  };

  const loadAuthorizedDevices = useCallback(
    () => listAuthorizedDevices({ id: dashboardClient.id, name: dashboardClient.name }),
    [dashboardClient.id, dashboardClient.name]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await loadAuthorizedDevices();
      setDevices(overview.devices);
      setAccess(overview.access);
      setCurrentDeviceId(overview.currentDeviceId);
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  }, [loadAuthorizedDevices, t]);

  useEffect(() => void refresh(), [refresh]);

  useEffect(() => {
    if (access !== 'authorized') return;
    const interval = window.setInterval(() => {
      void loadAuthorizedDevices()
        .then((overview) => {
          setDevices(overview.devices);
          setAccess(overview.access);
          setCurrentDeviceId(overview.currentDeviceId);
        })
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [access, loadAuthorizedDevices]);

  useEffect(
    () => () => {
      approvalSyncGeneration.current += 1;
    },
    []
  );

  const syncApprovedDevice = useCallback(
    async (knownDeviceIds: Set<string>) => {
      const generation = ++approvalSyncGeneration.current;
      for (let attempt = 0; attempt < 15; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
        if (approvalSyncGeneration.current !== generation) return;
        try {
          const overview = await loadAuthorizedDevices();
          if (approvalSyncGeneration.current !== generation) return;
          setDevices(overview.devices);
          setAccess(overview.access);
          setCurrentDeviceId(overview.currentDeviceId);
          if (overview.devices.some((device) => !knownDeviceIds.has(device.id))) return;
        } catch {
          // Keep the current list and retry while the approved device finishes connecting.
        }
      }
    },
    [loadAuthorizedDevices]
  );

  const review = async () => {
    setWorking(true);
    setError(null);
    try {
      setPendingPreview(await previewDeviceAuthorization(code));
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setWorking(false);
    }
  };

  const decide = async (approved: boolean) => {
    if (!pendingPreview) return;
    setWorking(true);
    setError(null);
    try {
      if (approved) {
        const knownDeviceIds = new Set(devices.map((device) => device.id));
        await approveDeviceAuthorization(pendingPreview.code, getCurrentDevicePairingPreferences());
        toast.success(t('settings.system.authorizedDevices.feedback.approved'));
        void syncApprovedDevice(knownDeviceIds);
      } else {
        await declineDeviceAuthorization(pendingPreview.code);
        toast.success(t('settings.system.authorizedDevices.feedback.declined'));
      }
      setCode('');
      setPendingPreview(null);
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setWorking(false);
    }
  };

  const revoke = async (device: AuthorizedDevice) => {
    setWorking(true);
    setError(null);
    try {
      await revokeAuthorizedDevice(device.id);
      setDevices((current) => current.filter(({ id }) => id !== device.id));
      toast.success(
        t('settings.system.authorizedDevices.feedback.removed', { name: device.name }),
        {
          description: t('settings.system.authorizedDevices.feedback.removedDescription'),
        }
      );
      setDeviceToRemove(null);
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setWorking(false);
    }
  };

  const saveName = async (device: AuthorizedDevice) => {
    const name = editingName.trim();
    if (!name) return;
    setWorking(true);
    setError(null);
    try {
      await renameAuthorizedDevice(device.id, name);
      setDevices((current) =>
        current.map((item) => (item.id === device.id ? { ...item, name } : item))
      );
      setEditingId(null);
      toast.success(t('settings.system.authorizedDevices.feedback.renamed', { name }));
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setWorking(false);
    }
  };

  const promote = async (device: AuthorizedDevice) => {
    setWorking(true);
    setError(null);
    try {
      await promoteAuthorizedDevice(device.id);
      setDevices((current) =>
        current.map((item) => ({
          ...item,
          role: item.id === device.id ? ('primary' as const) : ('authorized' as const),
        }))
      );
      if (device.id !== currentDeviceId) setAccess('authorized');
      toast.success(
        t('settings.system.authorizedDevices.feedback.promoted', { name: device.name }),
        {
          description: t('settings.system.authorizedDevices.feedback.promotedDescription'),
        }
      );
      setDeviceToPromote(null);
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        className={`overflow-hidden rounded-[22px] border ${styles.insetBorderColor} ${styles.insetBg}`}
      >
        {access === 'primary' ? (
          <div className="p-3.5 md:p-4">
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${styles.borderColor} ${styles.iconBg} ${styles.mutedColor}`}
              >
                <KeyRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${styles.textColor}`}>
                  {t('settings.system.authorizedDevices.connectTitle')}
                </p>
                <p className={`mt-0.5 text-xs leading-5 ${styles.subtleColor}`}>
                  {t('settings.system.authorizedDevices.connectDescription')}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                aria-label={t('settings.system.authorizedDevices.codeLabel')}
                size="small"
                value={code}
                onChange={(event) => {
                  setCode(formatOneTimeCode(event.target.value, 12));
                  setPendingPreview(null);
                }}
                placeholder={t('settings.system.authorizedDevices.codePlaceholder')}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                maxLength={14}
                spellCheck={false}
                containerClassName="min-w-0 flex-1"
                inputClassName="font-mono tracking-[0.08em]"
              />
              <Button
                type="button"
                size="small"
                variant="secondary"
                className="shrink-0 rounded-full sm:min-w-28"
                leading={
                  working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )
                }
                disabled={working || code.replace(/[^a-fA-F0-9]/g, '').length !== 12}
                onClick={() => void review()}
              >
                {t('settings.system.authorizedDevices.reviewCode')}
              </Button>
            </div>
          </div>
        ) : access === 'authorized' ? (
          <div className="flex items-start gap-2.5 p-3.5 md:p-4">
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${styles.borderColor} ${styles.iconBg} ${styles.mutedColor}`}
            >
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${styles.textColor}`}>
                {t('settings.system.authorizedDevices.readOnlyTitle')}
              </p>
              <p className={`mt-0.5 text-xs leading-5 ${styles.subtleColor}`}>
                {t('settings.system.authorizedDevices.readOnlyDescription')}
              </p>
            </div>
          </div>
        ) : null}

        {access === 'primary' && pendingPreview ? (
          <div className={`border-t p-3.5 md:p-4 ${styles.dividerBorderColor}`}>
            <div className={`rounded-[18px] border p-3.5 ${styles.borderColor} ${styles.softBg}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-medium ${styles.textColor}`}>
                      {t('settings.system.authorizedDevices.approvalTitle', {
                        name: pendingPreview.deviceName,
                      })}
                    </p>
                    <Badge tone="accent" className="font-mono text-[10px] tracking-[0.08em]">
                      {pendingPreview.code.toUpperCase()}
                    </Badge>
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${styles.subtleColor}`}>
                    {t('settings.system.authorizedDevices.approvalDescription', {
                      providers: pendingPreview.providers.map(formatProvider).join(', '),
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="small"
                    variant="ghost"
                    disabled={working}
                    onClick={() => void decide(false)}
                  >
                    {t('settings.system.authorizedDevices.decline')}
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    className="rounded-full"
                    disabled={working}
                    onClick={() => void decide(true)}
                  >
                    {t('household.actions.approve')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {needsPrimarySelection ? (
          <div
            className={`border-t px-3 py-2.5 md:px-3.5 ${styles.dividerBorderColor}`}
            role="status"
          >
            <div className="flex gap-2.5">
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: styles.accentColor }}
              />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${styles.textColor}`}>
                  {t('settings.system.authorizedDevices.choosePrimaryTitle')}
                </p>
                <p className={`mt-0.5 text-xs leading-4 ${styles.subtleColor}`}>
                  {t('settings.system.authorizedDevices.choosePrimaryDescription')}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`border-t ${styles.dividerBorderColor}`}>
          {loading ? (
            <p
              className={`flex items-center gap-2 px-3.5 py-3 text-sm md:px-4 ${styles.subtleColor}`}
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" />{' '}
              {t('settings.system.authorizedDevices.loading')}
            </p>
          ) : error ? null : (
            <div className={`divide-y ${styles.dividerColor}`}>
              {devices.some((device) => device.role === 'primary') ? null : (
                <div className="flex min-w-0 items-center gap-2 px-3 py-2 md:px-3.5">
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border ${styles.borderColor} ${styles.softBg} ${styles.mutedColor}`}
                  >
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${styles.textColor}`}>
                      {access === 'primary' && currentDeviceId === null
                        ? t('settings.system.authorizedDevices.thisDevice')
                        : t('settings.system.authorizedDevices.originalSignIn')}
                    </p>
                    <p className={`mt-0.5 text-xs ${styles.subtleColor}`}>
                      {devices.length === 0
                        ? t('settings.system.authorizedDevices.primarySignInEmpty')
                        : t('settings.system.authorizedDevices.primarySignIn')}
                    </p>
                  </div>
                </div>
              )}

              {devices.map((device) => (
                <div key={device.id} className="px-3 py-2 md:px-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border ${styles.borderColor} ${styles.softBg} ${styles.mutedColor}`}
                    >
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {editingId === device.id ? (
                        <Input
                          autoFocus
                          aria-label={t('settings.system.authorizedDevices.deviceName')}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          size="small"
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                            {device.name}
                          </p>
                          {device.role === 'primary' ? (
                            <Badge tone="neutral" size="small" className="text-[10px]">
                              {t('settings.system.authorizedDevices.primary')}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                      <p className={`mt-0.5 text-xs leading-4 ${styles.subtleColor}`}>
                        {formatDeviceActivity(device)}
                      </p>
                    </div>
                    {access === 'primary' &&
                    (device.id !== currentDeviceId || needsPrimarySelection) ? (
                      editingId === device.id ? (
                        <Button
                          type="button"
                          size="small"
                          variant="ghost"
                          iconOnly
                          label={t('settings.system.authorizedDevices.saveName')}
                          disabled={working}
                          onClick={() => void saveName(device)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="small"
                              variant="ghost"
                              iconOnly
                              label={`${t('common.moreActions')}: ${device.name}`}
                              disabled={working}
                            >
                              <MoreHorizontal className="h-4.5 w-4.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {needsPrimarySelection || device.role !== 'primary' ? (
                              <DropdownMenuItem onSelect={() => setDeviceToPromote(device)}>
                                <ShieldCheck className="h-4 w-4" />
                                {t('settings.system.authorizedDevices.makePrimary')}
                              </DropdownMenuItem>
                            ) : null}
                            {device.id !== currentDeviceId ? (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setEditingId(device.id);
                                    setEditingName(device.name);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  {t('settings.system.authorizedDevices.rename')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeviceToRemove(device)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t('energy.setup.removeDevice')}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading ? (
          <div className={`border-t px-3 py-1 md:px-3.5 ${styles.dividerBorderColor}`}>
            <Button
              type="button"
              size="small"
              variant="ghost"
              className="rounded-full"
              leading={<RefreshCw className="h-3.5 w-3.5" />}
              disabled={working}
              onClick={() => void refresh()}
            >
              {t('rss.refreshNow')}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      <AlertDialog
        open={deviceToPromote !== null}
        onOpenChange={(open) => {
          if (!open && !working) setDeviceToPromote(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.system.authorizedDevices.promoteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.system.authorizedDevices.promoteDescription', {
                name: deviceToPromote?.name ?? t('settings.system.authorizedDevices.thisDevice'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={working || !deviceToPromote}
              onClick={() => {
                if (deviceToPromote) void promote(deviceToPromote);
              }}
            >
              {t('settings.system.authorizedDevices.makePrimary')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deviceToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !working) setDeviceToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.system.authorizedDevices.removeTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.system.authorizedDevices.removeDescription', {
                name: deviceToRemove?.name ?? t('settings.system.authorizedDevices.thisDevice'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={working || !deviceToRemove}
              onClick={() => {
                if (deviceToRemove) void revoke(deviceToRemove);
              }}
            >
              {t('energy.setup.removeDevice')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
