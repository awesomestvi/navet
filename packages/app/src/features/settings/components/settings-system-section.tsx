import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogo from '@navet/app/assets/providers/homey.svg';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Badge, Button, Input, ModalSurface } from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
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
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Link2,
  LocateFixed,
  LogOut,
  RotateCcw,
  Server,
  Settings2,
  Unplug,
} from 'lucide-react';
import { useState } from 'react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsDashboardClients } from './settings-dashboard-clients';
import { SettingsItem, SettingsSectionGroup, SettingsSectionShell } from './settings-section-shell';

interface SettingsSystemSectionProps {
  controller: SettingsSectionController;
}

const PROVIDER_SUPPORT_URLS: Record<IntegrationProviderId, string> = {
  home_assistant: 'https://docs.navet.app/integrations/#home-assistant',
  homey: 'https://docs.navet.app/integrations/#homey',
  openhab: 'https://docs.navet.app/integrations/#openhab',
  hubitat: 'https://docs.navet.app/integrations/#planned-providers',
  smartthings: 'https://docs.navet.app/integrations/#planned-providers',
};

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
        <img src={logoSrc} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
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
  t,
}: {
  expanded: boolean;
  onToggle: () => void;
  styles: SettingsSectionController['styles'];
  totalProviders: number;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor} ${styles.ringClass}`}
    >
      <Settings2 className="h-4 w-4" />
      <span>
        {expanded
          ? t('settings.system.providers.hideManagement')
          : t('settings.system.providers.manageOthers', { count: totalProviders })}
      </span>
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

function getProviderOpenUrl(provider: ProviderCard, configUrl: string | null) {
  if (!provider.isConnected) {
    return null;
  }

  if (provider.id === 'home_assistant') {
    return configUrl ?? provider.baseUrl ?? null;
  }

  return provider.baseUrl ?? null;
}

function getProviderUrlPlaceholder(provider: ProviderCard, t: ReturnType<typeof useI18n>['t']) {
  return provider.id === 'openhab'
    ? 'http://openhab.local:8080'
    : t('settings.system.providers.homeAssistantUrlPlaceholder');
}

function ProviderCardView({
  provider,
  styles,
  openConnectDialog,
  showActiveControls,
  setActiveProvider,
  handleConnectProvider,
  handleDisconnectProvider,
  t,
  configUrl,
}: {
  provider: ProviderCard;
  styles: SettingsSectionController['styles'];
  openConnectDialog: (providerId: IntegrationProviderId) => void;
  showActiveControls: boolean;
  setActiveProvider: SettingsSectionController['setActiveProvider'];
  handleConnectProvider: SettingsSectionController['handleConnectProvider'];
  handleDisconnectProvider: SettingsSectionController['handleDisconnectProvider'];
  t: ReturnType<typeof useI18n>['t'];
  configUrl: string | null;
}) {
  const usesUrlConnect = provider.loginMode === 'url_oauth' || provider.loginMode === 'url_session';
  const openUrl = getProviderOpenUrl(provider, configUrl);
  const displayUrl =
    provider.baseUrl ??
    (provider.id === 'home_assistant' && provider.isConnected ? configUrl : null);

  return (
    <div
      className={`rounded-[22px] border p-4 md:p-5 ${styles.insetBorderColor} ${styles.insetBg}`}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <ProviderLogoMark provider={provider} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                  {provider.label}
                </p>
                {provider.status === 'connected' ? (
                  <>
                    <span
                      className="shrink-0 text-[11px] font-medium leading-[14px]"
                      style={{ color: themeColorValues.green }}
                    >
                      {t('settings.system.providers.status.connected')}
                    </span>
                    {showActiveControls && provider.isActive ? (
                      <Badge tone="accent" className="text-[10px]">
                        {t('settings.system.providers.active')}
                      </Badge>
                    ) : null}
                  </>
                ) : provider.status !== 'disconnected' ? (
                  <ProviderStatusBadge label={getProviderStatusLabel(t, provider.status)} />
                ) : null}
              </div>
              <p
                className={`mt-1 truncate text-xs ${styles.subtleColor}`}
                title={displayUrl ?? t('settings.system.providers.notConnected')}
              >
                {displayUrl ?? t('settings.system.providers.notConnected')}
              </p>
              {provider.error ? (
                <p className="mt-2 text-sm leading-relaxed text-red-400">{provider.error}</p>
              ) : null}
            </div>
          </div>

          <a
            href={PROVIDER_SUPPORT_URLS[provider.id]}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 inline-flex h-9 items-center gap-2 rounded-full px-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.mutedColor} ${styles.hoverBg} ${styles.ringClass}`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{t('settings.system.providers.supportedEntities')}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div
          className="mt-3 flex w-full flex-wrap items-center gap-2"
          data-provider-actions={provider.id}
        >
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-9 min-w-32 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none sm:flex-none ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor} ${styles.ringClass}`}
            >
              <ExternalLink className="h-4 w-4" />
              <span>{t('common.open')}</span>
            </a>
          ) : null}

          {showActiveControls && provider.isConnected && !provider.isActive ? (
            <Button
              type="button"
              variant="secondary"
              size="small"
              leading={<LocateFixed className="h-4 w-4" />}
              className="min-w-32 flex-1 rounded-full sm:flex-none"
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
              className="min-w-32 flex-1 rounded-full sm:flex-none"
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
              className="min-w-32 flex-1 rounded-full sm:flex-none"
              onClick={() => openConnectDialog(provider.id)}
            >
              {t('settings.system.providers.connect')}
            </Button>
          ) : null}

          {provider.canDisconnect ? (
            <Button
              type="button"
              variant="destructive"
              size="small"
              leading={<Unplug className="h-4 w-4" />}
              className="min-w-32 flex-1 rounded-full sm:flex-none"
              onClick={() => void handleDisconnectProvider(provider.id)}
            >
              {t('settings.system.providers.disconnect')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SettingsSystemSection({ controller }: SettingsSystemSectionProps) {
  const { t } = useI18n();
  const [providerUrls, setProviderUrls] = useState<Record<string, string>>({
    home_assistant: '',
    openhab: '',
  });
  const [providerUsernames, setProviderUsernames] = useState<Record<string, string>>({
    openhab: '',
  });
  const [providerPasswords, setProviderPasswords] = useState<Record<string, string>>({
    openhab: '',
  });
  const [connectDialogProviderId, setConnectDialogProviderId] =
    useState<IntegrationProviderId | null>(null);
  const [showProviderManagement, setShowProviderManagement] = useState(() =>
    controller.providerCards.every((provider) => !provider.isConnected)
  );
  const {
    config,
    confirmLogout,
    handleConnectProvider,
    handleDisconnectProvider,
    handleLogout,
    handleResetLocalSettings,
    providerCards: allProviderCards,
    setActiveProvider,
    showLogoutConfirm,
    setShowLogoutConfirm,
    styles,
  } = controller;
  const providerCards = allProviderCards.filter(
    (provider) => provider.implementationStatus === 'implemented'
  );
  const connectedProviders = providerCards.filter((provider) => provider.isConnected);
  const showActiveControls = connectedProviders.length > 1;
  const managedProviders = providerCards.filter((provider) => !provider.isConnected);
  const connectDialogProvider =
    connectDialogProviderId === null
      ? null
      : (providerCards.find((provider) => provider.id === connectDialogProviderId) ?? null);
  const closeConnectDialog = () => setConnectDialogProviderId(null);
  const openConnectDialog = (providerId: IntegrationProviderId) =>
    setConnectDialogProviderId(providerId);

  return (
    <SettingsSectionShell
      id="system"
      icon={Server}
      title={t('settings.system.sectionTitle')}
      description={t('settings.system.sectionDescription')}
      styles={styles}
      grouped
    >
      <SettingsSectionGroup
        id="system-smart-home"
        title={t('settings.system.group.smartHome')}
        styles={styles}
      >
        <SettingsItem
          title={t('settings.system.providers.title')}
          description={t('settings.system.providers.description')}
          styles={styles}
        >
          <div className="space-y-3">
            {connectedProviders.length > 0 ? (
              <div className="grid gap-3">
                {connectedProviders.map((provider) => (
                  <ProviderCardView
                    key={provider.id}
                    provider={provider}
                    styles={styles}
                    openConnectDialog={openConnectDialog}
                    showActiveControls={showActiveControls}
                    setActiveProvider={setActiveProvider}
                    handleConnectProvider={handleConnectProvider}
                    handleDisconnectProvider={handleDisconnectProvider}
                    t={t}
                    configUrl={config?.url ?? null}
                  />
                ))}
              </div>
            ) : null}

            {managedProviders.length > 0 ? (
              <ProviderManagementToggle
                expanded={showProviderManagement}
                onToggle={() => setShowProviderManagement((current) => !current)}
                styles={styles}
                totalProviders={managedProviders.length}
                t={t}
              />
            ) : null}

            {showProviderManagement && managedProviders.length > 0 ? (
              <div className="grid gap-3">
                {managedProviders.map((provider) => (
                  <ProviderCardView
                    key={provider.id}
                    provider={provider}
                    styles={styles}
                    openConnectDialog={openConnectDialog}
                    showActiveControls={showActiveControls}
                    setActiveProvider={setActiveProvider}
                    handleConnectProvider={handleConnectProvider}
                    handleDisconnectProvider={handleDisconnectProvider}
                    t={t}
                    configUrl={config?.url ?? null}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </SettingsItem>
      </SettingsSectionGroup>

      {connectDialogProvider ? (
        <ModalSurface
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              closeConnectDialog();
            }
          }}
          title={t('login.connectProviderTitle', { provider: connectDialogProvider.label })}
          description={t('settings.system.providers.connectDescription', {
            provider: connectDialogProvider.label,
          })}
          contentClassName="max-w-lg"
          bodyClassName="overflow-hidden rounded-[28px]"
        >
          <form
            className="space-y-5 bg-[linear-gradient(180deg,rgba(10,16,26,0.96),rgba(6,10,18,0.98))] p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConnectProvider(
                connectDialogProvider.id,
                (providerUrls[connectDialogProvider.id] ?? '').trim(),
                connectDialogProvider.id === 'openhab'
                  ? (providerUsernames[connectDialogProvider.id] ?? '').trim()
                  : undefined,
                connectDialogProvider.id === 'openhab'
                  ? (providerPasswords[connectDialogProvider.id] ?? '')
                  : undefined
              );
              closeConnectDialog();
            }}
          >
            <div>
              <p className="text-base font-semibold text-white">
                {t('login.connectProviderTitle', { provider: connectDialogProvider.label })}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                {connectDialogProvider.id === 'openhab'
                  ? t('settings.system.providers.credentialsHelp')
                  : t('settings.system.providers.urlHelp')}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="provider-connect-url" className="text-xs font-medium text-white/55">
                  {t('settings.system.providers.url')}
                </label>
                <Input
                  id="provider-connect-url"
                  name="provider-url"
                  type="url"
                  autoComplete="off"
                  value={providerUrls[connectDialogProvider.id] ?? ''}
                  onChange={(event) =>
                    setProviderUrls((current) => ({
                      ...current,
                      [connectDialogProvider.id]: event.target.value,
                    }))
                  }
                  placeholder={getProviderUrlPlaceholder(connectDialogProvider, t)}
                  leading={<Home className="h-4 w-4 text-white/45" />}
                  inputClassName="text-white"
                />
              </div>

              {connectDialogProvider.id === 'openhab' ? (
                <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="provider-connect-username"
                      className="text-xs font-medium text-white/55"
                    >
                      {t('settings.system.providers.username')}
                    </label>
                    <Input
                      id="provider-connect-username"
                      name="provider-username"
                      autoComplete="username"
                      spellCheck={false}
                      value={providerUsernames[connectDialogProvider.id] ?? ''}
                      onChange={(event) =>
                        setProviderUsernames((current) => ({
                          ...current,
                          [connectDialogProvider.id]: event.target.value,
                        }))
                      }
                      placeholder={t('settings.system.providers.openhabUsernamePlaceholder')}
                      inputClassName="text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="provider-connect-password"
                      className="text-xs font-medium text-white/55"
                    >
                      {t('settings.system.providers.password')}
                    </label>
                    <Input
                      id="provider-connect-password"
                      name="provider-password"
                      type="password"
                      autoComplete="current-password"
                      value={providerPasswords[connectDialogProvider.id] ?? ''}
                      onChange={(event) =>
                        setProviderPasswords((current) => ({
                          ...current,
                          [connectDialogProvider.id]: event.target.value,
                        }))
                      }
                      placeholder={t('settings.system.providers.openhabPasswordPlaceholder')}
                      inputClassName="text-white"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                className="rounded-full"
                onClick={closeConnectDialog}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="secondary"
                size="small"
                leading={<Link2 className="h-4 w-4" />}
                className="rounded-full"
              >
                {t('settings.system.providers.connect')}
              </Button>
            </div>
          </form>
        </ModalSurface>
      ) : null}

      <SettingsSectionGroup
        id="system-devices-sync"
        title={t('settings.system.group.devicesSync')}
        styles={styles}
      >
        <SettingsItem
          title={t('settings.system.clients.title')}
          description={t('settings.system.clients.description')}
          styles={styles}
        >
          <SettingsDashboardClients styles={styles} />
        </SettingsItem>
      </SettingsSectionGroup>

      <SettingsSectionGroup
        id="system-device-data-session"
        title={t('settings.system.group.deviceDataSession')}
        styles={styles}
      >
        <SettingsItem
          title={t('settings.project.localData.title')}
          description={t('settings.project.localData.description')}
          styles={styles}
        >
          <button
            type="button"
            onClick={handleResetLocalSettings}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor} ${styles.ringClass}`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('settings.project.localData.reset')}</span>
          </button>
        </SettingsItem>

        <SettingsItem
          title={t('settings.project.logout')}
          description={t('settings.system.logout.description')}
          styles={styles}
        >
          <button
            type="button"
            onClick={handleLogout}
            className={`inline-flex h-9 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-3.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/12 focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.ringClass}`}
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
      </SettingsSectionGroup>
    </SettingsSectionShell>
  );
}

function ProviderStatusBadge({ label }: { label: string }) {
  return <Badge tone="neutral">{label}</Badge>;
}
