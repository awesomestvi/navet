import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogo from '@navet/app/assets/providers/homey.png';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Button, Input } from '@navet/app/components/primitives';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
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
import { useI18n } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type { CameraGo2RtcStreamNamingMode } from '@navet/app/stores';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Link2,
  LogOut,
  Radio,
  Server,
  Settings2,
  Unplug,
} from 'lucide-react';
import { useState } from 'react';
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

type ProviderCard = SettingsSectionController['providerCards'][number];

const PROVIDER_LOGOS: Partial<Record<IntegrationProviderId, string>> = {
  home_assistant: homeAssistantLogo,
  homey: homeyLogo,
  openhab: openhabLogo,
};

const PROVIDER_ACCENTS: Record<IntegrationProviderId, string> = {
  home_assistant:
    'from-sky-500/18 via-cyan-500/10 to-transparent ring-sky-400/20 shadow-[0_18px_42px_-34px_rgba(56,189,248,0.6)]',
  homey:
    'from-orange-500/18 via-amber-500/10 to-transparent ring-orange-400/20 shadow-[0_18px_42px_-34px_rgba(249,115,22,0.55)]',
  openhab:
    'from-emerald-500/18 via-lime-500/10 to-transparent ring-emerald-400/20 shadow-[0_18px_42px_-34px_rgba(16,185,129,0.55)]',
  hubitat:
    'from-fuchsia-500/14 via-pink-500/8 to-transparent ring-fuchsia-400/15 shadow-[0_18px_42px_-34px_rgba(217,70,239,0.45)]',
  smartthings:
    'from-blue-500/16 via-indigo-500/8 to-transparent ring-blue-400/15 shadow-[0_18px_42px_-34px_rgba(59,130,246,0.45)]',
};

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

function getProviderInitials(provider: ProviderCard) {
  if (provider.id === 'home_assistant') return 'HA';
  if (provider.id === 'openhab') return 'OH';
  if (provider.id === 'smartthings') return 'ST';
  return provider.label.slice(0, 2).toUpperCase();
}

function ProviderLogoMark({ provider }: { provider: ProviderCard }) {
  const logoSrc = PROVIDER_LOGOS[provider.id];
  const accentClassName = PROVIDER_ACCENTS[provider.id];

  return (
    <div
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] ring-1 ${accentClassName}`}
    >
      {logoSrc ? (
        <img src={logoSrc} alt="" className="h-7 w-7 object-contain" />
      ) : (
        <span className="text-xs font-semibold tracking-[0.2em] text-white/90">
          {getProviderInitials(provider)}
        </span>
      )}
    </div>
  );
}

function ProviderManagementToggle({
  expanded,
  onToggle,
  styles,
  totalProviders,
}: {
  expanded: boolean;
  onToggle: () => void;
  styles: SettingsSectionController['styles'];
  totalProviders: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
    >
      <Settings2 className="h-4 w-4" />
      <span>
        {expanded ? 'Hide provider management' : `Manage ${totalProviders} other providers`}
      </span>
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

function ProviderSummaryCard({
  provider,
  styles,
  t,
  configUrl,
  handleDisconnectProvider,
}: {
  provider: ProviderCard | undefined;
  styles: SettingsSectionController['styles'];
  t: ReturnType<typeof useI18n>['t'];
  configUrl: string | null;
  handleDisconnectProvider: SettingsSectionController['handleDisconnectProvider'];
}) {
  if (!provider) {
    return null;
  }
  const featureLabels = getSupportedProviderFeatureLabels(provider.featureMatrix);

  return (
    <div
      className={`rounded-[22px] border p-4 md:p-5 ${styles.borderColor} ${styles.softBg} shadow-[0_20px_50px_-40px_rgba(0,0,0,0.55)]`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <ProviderLogoMark provider={provider} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-semibold ${styles.textColor}`}>{provider.label}</p>
                {provider.isActive ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-emerald-300">
                    {t('settings.system.providers.active')}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-sm leading-relaxed ${styles.subtleColor}`}>
                {provider.baseUrl ?? 'Current provider for this device'}
              </p>
            </div>
          </div>
          {featureLabels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {featureLabels.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles.borderColor} ${styles.subtleColor}`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-2 md:min-w-[12rem] md:max-w-[12rem]">
          {provider.id === 'home_assistant' && configUrl ? (
            <>
              <a
                href={configUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{t('settings.system.connection.openHomeAssistant')}</span>
              </a>

              <button
                type="button"
                onClick={() => void handleDisconnectProvider('home_assistant')}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
              >
                <Unplug className="h-4 w-4" />
                <span>{t('settings.system.providers.disconnect')}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProviderCardView({
  provider,
  styles,
  providerUrl,
  setProviderUrl,
  showConnectForm,
  setShowConnectForm,
  handleConnectProvider,
  handleDisconnectProvider,
  setActiveProvider,
  t,
}: {
  provider: ProviderCard;
  styles: SettingsSectionController['styles'];
  providerUrl: string;
  setProviderUrl: (value: string) => void;
  showConnectForm: boolean;
  setShowConnectForm: (value: boolean) => void;
  handleConnectProvider: SettingsSectionController['handleConnectProvider'];
  handleDisconnectProvider: SettingsSectionController['handleDisconnectProvider'];
  setActiveProvider: SettingsSectionController['setActiveProvider'];
  t: ReturnType<typeof useI18n>['t'];
}) {
  const featureLabels = getSupportedProviderFeatureLabels(provider.featureMatrix);
  const usesUrlConnect = provider.loginMode === 'url_oauth' || provider.loginMode === 'url_session';

  return (
    <div
      className={`rounded-[22px] border p-4 md:p-5 ${styles.borderColor} ${styles.softBg} shadow-[0_18px_44px_-40px_rgba(0,0,0,0.55)]`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <ProviderLogoMark provider={provider} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-semibold ${styles.textColor}`}>{provider.label}</p>
                {provider.status !== 'disconnected' ? (
                  <ProviderStatusBadge
                    label={getProviderStatusLabel(t, provider.status)}
                    styles={styles}
                  />
                ) : null}
                {provider.isActive ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.borderColor} ${styles.textColor}`}
                  >
                    {t('settings.system.providers.active')}
                  </span>
                ) : null}
              </div>
              <p className={`mt-2 text-sm leading-relaxed ${styles.subtleColor}`}>
                {provider.baseUrl ?? t('settings.system.providers.notConnected')}
              </p>
              {provider.error ? (
                <p className="mt-2 text-sm leading-relaxed text-red-400">{provider.error}</p>
              ) : null}
            </div>
          </div>

          {featureLabels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {featureLabels.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles.borderColor} ${styles.subtleColor}`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className={`mt-4 text-sm leading-relaxed ${styles.subtleColor}`}>
              Planned provider support will appear here when this integration is ready.
            </p>
          )}
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

          {usesUrlConnect && !provider.isConnected ? (
            <Button
              type="button"
              variant="secondary"
              size="small"
              leading={<Link2 className="h-4 w-4" />}
              className="rounded-full"
              onClick={() => setShowConnectForm(!showConnectForm)}
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

      {usesUrlConnect && !provider.isConnected && showConnectForm ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void handleConnectProvider(provider.id, providerUrl.trim());
          }}
        >
          <Input
            value={providerUrl}
            onChange={(event) => setProviderUrl(event.target.value)}
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
  );
}

export function SettingsSystemSection({ controller }: SettingsSystemSectionProps) {
  const { t } = useI18n();
  const streamNamingOptions: CameraGo2RtcStreamNamingMode[] = ['entity_id', 'short_entity_id'];
  const [providerUrls, setProviderUrls] = useState<Record<string, string>>({
    home_assistant: '',
    openhab: '',
  });
  const [connectFormsOpen, setConnectFormsOpen] = useState<Record<string, boolean>>({});
  const [showProviderManagement, setShowProviderManagement] = useState(() =>
    controller.providerCards.every((provider) => !provider.isConnected)
  );
  const {
    config,
    cameraGo2RtcDefaults,
    confirmLogout,
    handleConnectProvider,
    handleDisconnectProvider,
    handleLogout,
    providerCards: allProviderCards,
    setActiveProvider,
    showLogoutConfirm,
    setShowLogoutConfirm,
    styles,
    updateSettings,
  } = controller;
  const providerCards = allProviderCards.filter(
    (provider) => provider.implementationStatus === 'implemented'
  );
  const spotlightProvider =
    providerCards.find((provider) => provider.isActive) ??
    providerCards.find((provider) => provider.isConnected) ??
    providerCards[0];
  const managedProviders = spotlightProvider?.isConnected
    ? providerCards.filter((provider) => provider.id !== spotlightProvider.id)
    : providerCards;

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
        <div className="space-y-3">
          <ProviderSummaryCard
            provider={spotlightProvider}
            styles={styles}
            t={t}
            configUrl={config?.url ?? null}
            handleDisconnectProvider={handleDisconnectProvider}
          />

          <ProviderManagementToggle
            expanded={showProviderManagement}
            onToggle={() => setShowProviderManagement((current) => !current)}
            styles={styles}
            totalProviders={managedProviders.length}
          />

          {showProviderManagement && managedProviders.length > 0 ? (
            <div className="grid gap-3">
              {managedProviders.map((provider) => (
                <ProviderCardView
                  key={provider.id}
                  provider={provider}
                  styles={styles}
                  providerUrl={providerUrls[provider.id] ?? ''}
                  setProviderUrl={(value) =>
                    setProviderUrls((current) => ({
                      ...current,
                      [provider.id]: value,
                    }))
                  }
                  showConnectForm={Boolean(connectFormsOpen[provider.id])}
                  setShowConnectForm={(value) =>
                    setConnectFormsOpen((current) => ({
                      ...current,
                      [provider.id]: value,
                    }))
                  }
                  handleConnectProvider={handleConnectProvider}
                  handleDisconnectProvider={handleDisconnectProvider}
                  setActiveProvider={setActiveProvider}
                  t={t}
                />
              ))}
            </div>
          ) : null}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.interaction.cameraStreams.title')}
        description={t('settings.interaction.cameraStreams.description')}
        styles={styles}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className={`block text-xs font-medium ${styles.subtleColor}`}
              htmlFor="go2rtc-default-server-url"
            >
              {t('camera.settings.go2rtc.defaultServerUrl')}
            </label>
            <Input
              id="go2rtc-default-server-url"
              value={cameraGo2RtcDefaults.serverUrl}
              onChange={(event) =>
                updateSettings({
                  cameraGo2RtcDefaults: {
                    ...cameraGo2RtcDefaults,
                    serverUrl: event.target.value,
                  },
                })
              }
              placeholder="http://homeassistant.local:11984"
              size="small"
              variant="soft"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <p className={`text-xs font-medium ${styles.subtleColor}`}>
              {t('camera.settings.go2rtc.streamNamingMode')}
            </p>
            <div className="flex flex-wrap gap-2">
              {streamNamingOptions.map((option) => {
                const isActive = cameraGo2RtcDefaults.streamNamingMode === option;
                return (
                  <InteractivePill
                    key={option}
                    active={isActive}
                    size="small"
                    onClick={() =>
                      updateSettings({
                        cameraGo2RtcDefaults: {
                          ...cameraGo2RtcDefaults,
                          streamNamingMode: option,
                        },
                      })
                    }
                    aria-pressed={isActive}
                  >
                    {t(`camera.settings.go2rtc.streamNamingMode.${option}` as TranslationKey)}
                  </InteractivePill>
                );
              })}
            </div>
          </div>
        </div>
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
