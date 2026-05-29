import { ExternalLink, Home, Link2, LogOut, Radio, Server, Settings2, Unplug } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '@/app/components/primitives';
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
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsSystemSectionProps {
  controller: SettingsSectionController;
}

const PROVIDER_FEATURE_LABELS = {
  rooms: 'Rooms',
  lighting: 'Lighting',
  sensors: 'Sensors',
  climate: 'Climate',
  mediaControls: 'Media',
  mediaBrowse: 'Browse',
  mediaArtwork: 'Artwork',
  cameraSnapshot: 'Snapshots',
  cameraStreams: 'Streams',
  energyNow: 'Energy',
  calendar: 'Calendar',
  weather: 'Weather',
  notifications: 'Notifications',
} as const;

type ProviderCardStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'signed-in'
  | 'disconnected'
  | 'planned';

function getProviderStatusLabel(t: ReturnType<typeof useI18n>['t'], status: ProviderCardStatus) {
  switch (status) {
    case 'connected':
      return t('settings.system.providers.status.connected');
    case 'connecting':
      return t('settings.system.providers.status.connecting');
    case 'reconnecting':
      return t('settings.system.providers.status.reconnecting');
    case 'signed-in':
      return t('settings.system.providers.status.signed-in');
    case 'disconnected':
      return t('settings.system.providers.status.disconnected');
    case 'planned':
      return t('settings.system.providers.status.planned');
  }
}

function getSupportedProviderFeatureLabels(
  featureMatrix: {
    [K in keyof typeof PROVIDER_FEATURE_LABELS]: boolean;
  }
) {
  return Object.entries(PROVIDER_FEATURE_LABELS)
    .filter(([feature]) => featureMatrix[feature as keyof typeof PROVIDER_FEATURE_LABELS])
    .map(([, label]) => label);
}

export function SettingsSystemSection({ controller }: SettingsSystemSectionProps) {
  const { t } = useI18n();
  const [providerUrls, setProviderUrls] = useState<Record<string, string>>({
    home_assistant: '',
    openhab: '',
  });
  const {
    activeProviderId,
    config,
    confirmLogout,
    handleConnectProvider,
    handleDisconnectProvider,
    handleLogout,
    handleResetConnection,
    providerCards,
    setActiveProvider,
    showLogoutConfirm,
    setShowLogoutConfirm,
    styles,
  } = controller;

  return (
    <SettingsSectionShell
      id="system"
      icon={Server}
      title={t('settings.system.sectionTitle')}
      description={t('settings.system.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.system.providers.title')}
        description={t('settings.system.providers.description')}
        styles={styles}
      >
        <div className="flex flex-col gap-3">
          {providerCards.map((provider) => (
            <div
              key={provider.id}
              className={`rounded-[20px] border px-4 py-4 md:rounded-[24px] md:px-5 ${styles.borderColor} ${styles.softBg}`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${styles.textColor}`}>{provider.label}</p>
                    <ProviderStatusBadge
                      label={getProviderStatusLabel(t, provider.status)}
                      styles={styles}
                    />
                    {provider.isActive ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.borderColor} ${styles.textColor}`}
                      >
                        {t('settings.system.providers.active')}
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-2 text-sm leading-relaxed ${styles.subtleColor}`}>
                    {provider.baseUrl
                      ? provider.baseUrl
                      : provider.status === 'planned'
                        ? t('settings.system.providers.notConnected')
                        : t('settings.system.providers.notConnected')}
                  </p>
                  {provider.error ? (
                    <p className="mt-2 text-sm leading-relaxed text-red-400">{provider.error}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getSupportedProviderFeatureLabels(provider.featureMatrix).map((label) => (
                      <span
                        key={label}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles.borderColor} ${styles.subtleColor}`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {provider.isConnected && !provider.isActive ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      leading={<Radio className="h-4 w-4" />}
                      className="rounded-full"
                      onClick={() => setActiveProvider(provider.id)}
                    >
                      {t('settings.system.providers.makeActive')}
                    </Button>
                  ) : null}

                  {provider.id === 'homey' && !provider.isConnected ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      leading={<Link2 className="h-4 w-4" />}
                      className="rounded-full"
                      onClick={() => void handleConnectProvider('homey')}
                    >
                      {t('settings.system.providers.connect')}
                    </Button>
                  ) : null}

                  {provider.canDisconnect ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      leading={<Unplug className="h-4 w-4" />}
                      className="rounded-full"
                      onClick={() => void handleDisconnectProvider(provider.id)}
                    >
                      {t('settings.system.providers.disconnect')}
                    </Button>
                  ) : null}
                </div>
              </div>

              {(provider.loginMode === 'url_oauth' || provider.loginMode === 'url_session') &&
              !provider.isConnected ? (
                <form
                  className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleConnectProvider(
                      provider.id,
                      providerUrls[provider.id]?.trim() ?? ''
                    );
                  }}
                >
                  <Input
                    value={providerUrls[provider.id] ?? ''}
                    onChange={(event) =>
                      setProviderUrls((current) => ({
                        ...current,
                        [provider.id]: event.target.value,
                      }))
                    }
                    placeholder={t('settings.system.providers.homeAssistantUrlPlaceholder')}
                    leading={<Home className={`h-4 w-4 ${styles.subtleColor}`} />}
                    inputClassName={styles.textColor}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="small"
                    leading={<Link2 className="h-4 w-4" />}
                    className="rounded-full"
                  >
                    {t('settings.system.providers.connect')}
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.system.connection.title')}
        description={t('settings.system.connection.description')}
        styles={styles}
      >
        <div
          className={`rounded-[20px] border px-4 py-3.5 md:rounded-[24px] md:px-5 md:py-4 ${styles.borderColor} ${styles.softBg}`}
        >
          <p className={`text-xs uppercase tracking-[0.18em] ${styles.subtleColor}`}>
            {t('settings.system.connection.connectedTo')}
          </p>
          <p className={`mt-2 break-all font-mono text-sm ${styles.textColor}`}>
            {config?.url || t('settings.system.connection.notConnected')}
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${styles.subtleColor}`}>
            {t('settings.system.providers.activeLabel', {
              provider:
                providerCards.find((provider) => provider.id === activeProviderId)?.label ?? '',
            })}
          </p>
        </div>

        {config?.url ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
            >
              <ExternalLink className="h-4 w-4" />
              <span>{t('settings.system.connection.openHomeAssistant')}</span>
            </a>

            <button
              type="button"
              onClick={handleResetConnection}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
            >
              <Settings2 className="h-4 w-4" />
              <span>{t('settings.system.connection.reset')}</span>
            </button>
          </div>
        ) : null}
      </SettingsItem>

      <SettingsItem
        title={t('settings.project.logout')}
        description={t('settings.system.logout.description')}
        styles={styles}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-3.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/12"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('settings.project.logout')}</span>
        </button>

        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.feedback.logoutConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.system.logout.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLogout}>
                {t('settings.project.logout')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsItem>
    </SettingsSectionShell>
  );
}

function ProviderStatusBadge({
  label,
  styles,
}: {
  label: string;
  styles: SettingsSectionController['styles'];
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.borderColor} ${styles.subtleColor}`}
    >
      {label}
    </span>
  );
}
