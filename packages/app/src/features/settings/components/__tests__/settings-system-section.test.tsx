import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { emptyDeviceDisplayProfilePolicy } from '@navet/app/features/dashboard/clients/device-display-profile';
import { useDeviceDisplayProfileRuntimeStore } from '@navet/app/features/dashboard/clients/device-display-profile-runtime-store';
import { DASHBOARD_PROFILE_REFRESH_EVENT } from '@navet/app/features/dashboard/hooks/use-dashboard-profile-sync';
import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import type { SettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSystemSection } from '../settings-system-section';

const dashboardProfileServiceMocks = vi.hoisted(() => ({
  copyDashboardDisplaySettings: vi.fn(),
  forgetDashboardProfileClient: vi.fn(),
  loadDashboardProfileHistory: vi.fn(),
  restoreDashboardProfileRevision: vi.fn(),
}));

vi.mock('@navet/app/services/dashboard-profile.service', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@navet/app/services/dashboard-profile.service')>();
  return {
    ...original,
    ...dashboardProfileServiceMocks,
  };
});

function createController(): SettingsSectionController {
  return {
    activeProviderId: 'home_assistant',
    config: { url: 'https://ha.example.com' },
    confirmLogout: vi.fn(),
    customPrimaryColor: null,
    disableAnimations: false,
    effectsQuality: 'high',
    effectsQualityUserOverride: false,
    entityInteractionMode: 'toggle-first',
    followSystemTheme: false,
    setFollowSystemTheme: vi.fn(),
    handleConnectProvider: vi.fn(),
    handleDisconnectProvider: vi.fn(),
    handleExportDashboardConfig: vi.fn(),
    handleImportDashboardConfig: vi.fn(),
    handleLogout: vi.fn(),
    handleResetLocalSettings: vi.fn(),
    handleRemoveWallpaper: vi.fn(),
    handleResetConnection: vi.fn(),
    handleRestartOnboarding: vi.fn(),
    handleSelectWallpaper: vi.fn(),
    handleWallpaperUpload: vi.fn(),
    hiddenEntityIds: [],
    importInputRef: { current: null },
    kioskMode: false,
    keepDeviceAwake: false,
    language: 'en',
    languageOptions: [],
    lowPowerMode: false,
    manualTheme: 'glass',
    primaryColor: 'yellow',
    providerCards: [
      {
        id: 'home_assistant',
        label: 'Home Assistant',
        loginMode: 'url_oauth',
        status: 'connected',
        isActive: true,
        isConnected: true,
        canConnect: true,
        canDisconnect: true,
        baseUrl: 'https://ha.example.com',
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: true,
          mediaControls: true,
          mediaBrowse: true,
          mediaArtwork: true,
          cameraSnapshot: true,
          cameraStreams: true,
          energyNow: true,
          calendar: true,
          weather: true,
          notifications: true,
        },
      },
      {
        id: 'homey',
        label: 'Homey',
        loginMode: 'oauth',
        status: 'disconnected',
        isActive: false,
        isConnected: false,
        canConnect: true,
        canDisconnect: false,
        baseUrl: null,
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: false,
          mediaControls: false,
          mediaBrowse: false,
          mediaArtwork: false,
          cameraSnapshot: false,
          cameraStreams: false,
          energyNow: false,
          calendar: false,
          weather: false,
          notifications: false,
        },
      },
      {
        id: 'openhab',
        label: 'openHAB',
        loginMode: 'url_session',
        status: 'disconnected',
        isActive: false,
        isConnected: false,
        canConnect: true,
        canDisconnect: false,
        baseUrl: null,
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: false,
          lighting: false,
          sensors: false,
          climate: false,
          mediaControls: false,
          mediaBrowse: false,
          mediaArtwork: false,
          cameraSnapshot: false,
          cameraStreams: false,
          energyNow: false,
          calendar: false,
          weather: false,
          notifications: false,
        },
      },
    ],
    reopenOnboarding: vi.fn(),
    setActiveProvider: vi.fn(),
    setCustomPrimaryColor: vi.fn(),
    setPrimaryColor: vi.fn(),
    setShowLicense: vi.fn(),
    setShowLogoutConfirm: vi.fn(),
    setShowRestartOnboardingConfirm: vi.fn(),
    setShowRevealAllConfirm: vi.fn(),
    setShowTerms: vi.fn(),
    setTheme: vi.fn(),
    showAllEntities: vi.fn(),
    showHomeSummaryBar: true,
    showLicense: false,
    showLogoutConfirm: false,
    showRestartOnboardingConfirm: false,
    showRevealAllConfirm: false,
    showTerms: false,
    styles: getSettingsSectionStyles('glass', 'yellow'),
    temperatureUnit: 'celsius',
    theme: 'glass',
    themeOptions: [],
    colorOptions: [],
    updateSettings: vi.fn(),
    use24HourTime: true,
    wallpaper: null,
    ambientLightBleed: true,
  } as unknown as SettingsSectionController;
}

describe('SettingsSystemSection', () => {
  let controller: SettingsSectionController;

  beforeEach(() => {
    vi.clearAllMocks();
    dashboardProfileServiceMocks.forgetDashboardProfileClient.mockResolvedValue(false);
    dashboardProfileServiceMocks.loadDashboardProfileHistory.mockResolvedValue(null);
    localStorage.clear();
    useDashboardProfileRuntimeStore.getState().reset();
    useDeviceDisplayProfileRuntimeStore.setState({
      error: null,
      lastSyncedAt: null,
      loaded: false,
      policy: emptyDeviceDisplayProfilePolicy(),
      revision: 0,
      status: 'disabled',
    });
    const client = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPhone; Mobile)' },
      now: () => new Date('2026-07-25T08:00:00.000Z'),
      randomUUID: () => '12345678-1234-1234-1234-123456785555',
    });
    useDashboardProfileRuntimeStore.getState().setClient(client);
    controller = createController();
  });

  it('shows connected providers immediately and keeps disconnected ones in provider management', () => {
    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Home Assistant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage 2 other providers' })).toBeInTheDocument();
    expect(screen.queryByText('openHAB')).not.toBeInTheDocument();
    expect(screen.queryByText('Camera live streams')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manage 2 other providers' }));

    expect(screen.getByText('Homey')).toBeInTheDocument();
    expect(screen.getByText('openHAB')).toBeInTheDocument();
    expect(screen.getAllByText('Not connected on this device').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connected')[0]).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make active' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Lighting').length).toBeGreaterThan(0);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows all connected providers without hiding them behind provider management', () => {
    controller.providerCards = [
      {
        id: 'home_assistant',
        label: 'Home Assistant',
        loginMode: 'url_oauth',
        status: 'connected',
        isActive: false,
        isConnected: true,
        canConnect: true,
        canDisconnect: true,
        baseUrl: 'https://ha.example.com',
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: true,
          mediaControls: true,
          mediaBrowse: true,
          mediaArtwork: true,
          cameraSnapshot: true,
          cameraStreams: true,
          energyNow: true,
          calendar: true,
          weather: true,
          notifications: true,
        },
      },
      {
        id: 'homey',
        label: 'Homey',
        loginMode: 'oauth',
        status: 'connected',
        isActive: true,
        isConnected: true,
        canConnect: true,
        canDisconnect: true,
        baseUrl: 'https://homey.example.com',
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: false,
          mediaControls: false,
          mediaBrowse: false,
          mediaArtwork: false,
          cameraSnapshot: false,
          cameraStreams: false,
          energyNow: false,
          calendar: false,
          weather: false,
          notifications: false,
        },
      },
    ] as typeof controller.providerCards;

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Home Assistant')).toBeInTheDocument();
    expect(screen.getByText('Homey')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Manage .* other providers/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make active' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Make active' }));
    expect(controller.setActiveProvider).toHaveBeenCalledWith('home_assistant');

    fireEvent.click(screen.getAllByRole('button', { name: 'Disconnect' })[0]);
    expect(controller.handleDisconnectProvider).toHaveBeenCalledWith('home_assistant');
  });

  it('submits a Home Assistant URL and disconnects connected providers', () => {
    controller.providerCards = [
      {
        id: 'home_assistant',
        label: 'Home Assistant',
        loginMode: 'url_oauth',
        status: 'disconnected',
        isActive: true,
        isConnected: false,
        canConnect: true,
        canDisconnect: false,
        baseUrl: null,
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: true,
          mediaControls: true,
          mediaBrowse: true,
          mediaArtwork: true,
          cameraSnapshot: true,
          cameraStreams: true,
          energyNow: true,
          calendar: true,
          weather: true,
          notifications: true,
        },
      },
      {
        id: 'homey',
        label: 'Homey',
        loginMode: 'oauth',
        status: 'connected',
        isActive: false,
        isConnected: true,
        canConnect: true,
        canDisconnect: true,
        baseUrl: 'https://homey.example.com',
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: false,
          mediaControls: false,
          mediaBrowse: false,
          mediaArtwork: false,
          cameraSnapshot: false,
          cameraStreams: false,
          energyNow: false,
          calendar: false,
          weather: false,
          notifications: false,
        },
      },
    ] as typeof controller.providerCards;

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage 1 other providers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    fireEvent.change(screen.getByPlaceholderText('https://homeassistant.local:8123'), {
      target: { value: 'https://ha.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(controller.handleConnectProvider).toHaveBeenCalledWith(
      'home_assistant',
      'https://ha.example.com',
      undefined,
      undefined
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(controller.handleDisconnectProvider).toHaveBeenCalledWith('homey');
  });

  it('submits openHAB credentials from settings connect flow', () => {
    controller.providerCards = [
      {
        id: 'openhab',
        label: 'openHAB',
        loginMode: 'url_session',
        status: 'disconnected',
        isActive: false,
        isConnected: false,
        canConnect: true,
        canDisconnect: false,
        baseUrl: null,
        error: null,
        implementationStatus: 'implemented',
        featureMatrix: {
          rooms: true,
          lighting: true,
          sensors: true,
          climate: true,
          mediaControls: false,
          mediaBrowse: false,
          mediaArtwork: false,
          cameraSnapshot: false,
          cameraStreams: false,
          energyNow: false,
          calendar: false,
          weather: false,
          notifications: false,
        },
      },
    ] as typeof controller.providerCards;

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    fireEvent.change(screen.getByPlaceholderText('http://openhab.local:8080'), {
      target: { value: 'http://openhab.local:8080' },
    });
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'navet' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(controller.handleConnectProvider).toHaveBeenCalledWith(
      'openhab',
      'http://openhab.local:8080',
      'navet',
      'secret'
    );
  });

  it('shows sync state, attributed changes, and lets this device be renamed', () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    useDashboardProfileRuntimeStore.getState().setClients([
      {
        id: currentClient?.id ?? 'current',
        name: currentClient?.name ?? 'Phone 5555',
        kind: 'phone',
        firstSeenAt: '2026-07-25T08:00:00.000Z',
        lastSeenAt: '2026-07-25T08:00:00.000Z',
        lastRevision: 4,
      },
      {
        id: 'kitchen_panel',
        name: 'Kitchen panel',
        kind: 'wall_panel',
        firstSeenAt: '2026-07-24T08:00:00.000Z',
        lastSeenAt: '2026-07-25T09:00:00.000Z',
        lastRevision: 5,
        userName: 'Vishal',
      },
    ]);
    useDashboardProfileRuntimeStore.getState().markSynced({
      revision: 5,
      workspaceId: 'workspace_1',
      activity: {
        id: 'workspace_1:5',
        revision: 5,
        changedAt: '2026-07-25T09:00:00.000Z',
        changedPaths: ['/theme/primaryColor'],
        actor: {
          clientId: 'kitchen_panel',
          clientName: 'Kitchen panel',
          clientKind: 'wall_panel',
          userName: 'Vishal',
        },
      },
    });

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Connected devices')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getByText('Other devices')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getAllByText('Revision 5')).toHaveLength(2);
    expect(screen.getByText('Dashboard updated from Kitchen panel')).toBeInTheDocument();
    expect(screen.getByText('Signed in as Vishal')).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'Device name' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rename device' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Device name' }), {
      target: { value: 'Vishal’s phone' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(useDashboardProfileRuntimeStore.getState().client?.name).toBe('Vishal’s phone');
    expect(screen.queryByRole('textbox', { name: 'Device name' })).not.toBeInTheDocument();
  });

  it('hides the other devices section when this is the only registered device', () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    if (!currentClient) return;

    useDashboardProfileRuntimeStore.getState().setClients([
      {
        id: currentClient.id,
        name: currentClient.name,
        kind: currentClient.kind,
        firstSeenAt: '2026-07-25T08:00:00.000Z',
        lastSeenAt: '2026-07-25T08:00:00.000Z',
        lastRevision: 5,
      },
    ]);

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.queryByText('Other devices')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No other device has connected to this Navet installation yet.')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename device' })).toBeInTheDocument();
  });

  it('copies display settings once or creates an automatic linked profile', async () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    if (!currentClient) return;
    const kitchenPanel = {
      id: 'kitchen_panel',
      name: 'Kitchen panel',
      kind: 'wall_panel' as const,
      firstSeenAt: '2026-07-24T08:00:00.000Z',
      lastSeenAt: '2026-07-25T09:00:00.000Z',
      lastRevision: 5,
    };
    useDashboardProfileRuntimeStore.getState().setClients([
      {
        id: currentClient.id,
        name: currentClient.name,
        kind: currentClient.kind,
        firstSeenAt: '2026-07-25T08:00:00.000Z',
        lastSeenAt: '2026-07-25T08:00:00.000Z',
        lastRevision: 5,
      },
      kitchenPanel,
    ]);
    useDeviceDisplayProfileRuntimeStore
      .getState()
      .replacePolicy(emptyDeviceDisplayProfilePolicy(), 0);
    dashboardProfileServiceMocks.copyDashboardDisplaySettings.mockResolvedValue({
      updatedClientIds: [kitchenPanel.id],
      skippedClientIds: [],
    });

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Independent on this device')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy to devices' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy settings' }));
    await waitFor(() =>
      expect(dashboardProfileServiceMocks.copyDashboardDisplaySettings).toHaveBeenCalledWith(
        expect.objectContaining({ kioskMode: false, effectsQualityUserOverride: false }),
        [kitchenPanel.id],
        expect.objectContaining({ id: currentClient.id })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Keep devices in sync' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'Personal devices' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      Object.values(useDeviceDisplayProfileRuntimeStore.getState().policy.profilesById)
    ).toEqual([
      expect.objectContaining({
        name: 'Personal devices',
        settings: expect.objectContaining({
          kioskMode: false,
          effectsQualityUserOverride: false,
        }),
      }),
    ]);
    expect(
      useDeviceDisplayProfileRuntimeStore.getState().policy.profileIdByClientId[currentClient.id]
    ).toBeTruthy();
  });

  it('loads revision history on demand and restores an older snapshot as a new revision', async () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    if (!currentClient) return;

    useDashboardProfileRuntimeStore.getState().markSynced({
      revision: 5,
      workspaceId: 'workspace_1',
    });
    dashboardProfileServiceMocks.loadDashboardProfileHistory.mockResolvedValue({
      workspace: {
        contractVersion: 1,
        installationId: 'installation_1',
        workspaceId: 'workspace_1',
        defaultProfileId: 'default',
        createdAt: '2026-07-20T08:00:00.000Z',
      },
      entries: [
        {
          contractVersion: 1,
          installationId: 'installation_1',
          workspaceId: 'workspace_1',
          profileId: 'default',
          revision: 5,
          generation: 'generation_5',
          kind: 'update',
          updatedAt: '2026-07-25T09:00:00.000Z',
          author: {
            id: currentClient.id,
            name: currentClient.name,
            kind: currentClient.kind,
            providerId: 'home_assistant',
            userId: 'user_1',
            userName: 'Vishal',
          },
          changedPaths: ['/theme/primaryColor'],
          hasProfile: true,
        },
        {
          contractVersion: 1,
          installationId: 'installation_1',
          workspaceId: 'workspace_1',
          profileId: 'default',
          revision: 3,
          generation: 'generation_3',
          kind: 'update',
          updatedAt: '2026-07-24T09:00:00.000Z',
          author: {
            id: 'kitchen_panel',
            name: 'Kitchen panel',
            kind: 'wall_panel',
            providerId: 'home_assistant',
            userId: 'user_1',
            userName: 'Vishal',
          },
          changedPaths: ['/homeDashboardLayout/sections'],
          hasProfile: true,
        },
      ],
    });
    dashboardProfileServiceMocks.restoreDashboardProfileRevision.mockResolvedValue({
      saved: true,
      unauthorized: false,
      permanentFailure: false,
      preconditionFailed: false,
      preconditionRequired: false,
      etag: '"revision-6"',
      lastModified: '2026-07-25T10:00:00.000Z',
      generation: 'generation_6',
      revision: 6,
      workspace: {
        contractVersion: 1,
        installationId: 'installation_1',
        workspaceId: 'workspace_1',
        defaultProfileId: 'default',
        createdAt: '2026-07-20T08:00:00.000Z',
      },
      metadata: {
        contractVersion: 1,
        installationId: 'installation_1',
        workspaceId: 'workspace_1',
        profileId: 'default',
        revision: 6,
        generation: 'generation_6',
        kind: 'restore',
        updatedAt: '2026-07-25T10:00:00.000Z',
        author: {
          id: currentClient.id,
          name: currentClient.name,
          kind: currentClient.kind,
          providerId: 'home_assistant',
          userId: 'user_1',
          userName: 'Vishal',
        },
        changedPaths: ['/'],
        restoredFromRevision: 3,
      },
      recovery: {
        status: 'active',
        resetRevision: null,
        latestRecoverableRevision: null,
      },
    });
    const refreshListener = vi.fn();
    window.addEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(dashboardProfileServiceMocks.loadDashboardProfileHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Revision history' }));

    await waitFor(() => {
      expect(dashboardProfileServiceMocks.loadDashboardProfileHistory).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Revision 3')).toBeInTheDocument();
    const historyViewport = screen.getByRole('region', { name: 'Revision history' });
    expect(historyViewport).toHaveClass(
      'max-h-[min(22rem,55vh)]',
      'overflow-y-auto',
      'overscroll-contain'
    );
    expect(historyViewport.querySelector('[class*="content-visibility:auto"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    const confirmation = screen.getByRole('group', { name: 'Restore revision 3?' });
    expect(
      within(confirmation).getByText(/records the restore as a new revision/)
    ).toBeInTheDocument();
    expect(dashboardProfileServiceMocks.restoreDashboardProfileRevision).not.toHaveBeenCalled();

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(dashboardProfileServiceMocks.restoreDashboardProfileRevision).toHaveBeenCalledWith(3, {
        author: currentClient,
        baseRevision: 5,
      });
    });
    expect(useDashboardProfileRuntimeStore.getState().revision).toBe(6);
    expect(refreshListener).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Revision 3 was restored and saved as a new revision.')
    ).toBeInTheDocument();

    window.removeEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);
  });

  it('refreshes sync and history after a stale restore attempt', async () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    if (!currentClient) return;

    useDashboardProfileRuntimeStore.getState().markSynced({
      revision: 5,
      workspaceId: 'workspace_1',
    });
    dashboardProfileServiceMocks.loadDashboardProfileHistory.mockResolvedValue({
      workspace: {
        contractVersion: 1,
        installationId: 'installation_1',
        workspaceId: 'workspace_1',
        defaultProfileId: 'default',
        createdAt: '2026-07-20T08:00:00.000Z',
      },
      entries: [
        {
          contractVersion: 1,
          installationId: 'installation_1',
          workspaceId: 'workspace_1',
          profileId: 'default',
          revision: 3,
          generation: 'generation_3',
          kind: 'update',
          updatedAt: '2026-07-24T09:00:00.000Z',
          author: {
            id: 'kitchen_panel',
            name: 'Kitchen panel',
            kind: 'wall_panel',
            providerId: 'home_assistant',
            userId: 'user_1',
            userName: 'Vishal',
          },
          changedPaths: ['/homeDashboardLayout/sections'],
          hasProfile: true,
        },
      ],
    });
    dashboardProfileServiceMocks.restoreDashboardProfileRevision.mockResolvedValue({
      saved: false,
      unauthorized: false,
      permanentFailure: false,
      preconditionFailed: true,
      preconditionRequired: false,
      etag: '"revision-6"',
      lastModified: '2026-07-25T10:00:00.000Z',
      generation: 'generation_6',
      revision: 6,
      workspace: {
        contractVersion: 1,
        installationId: 'installation_1',
        workspaceId: 'workspace_1',
        defaultProfileId: 'default',
        createdAt: '2026-07-20T08:00:00.000Z',
      },
      metadata: null,
      recovery: {
        status: 'active',
        resetRevision: null,
        latestRecoverableRevision: null,
      },
    });
    const refreshListener = vi.fn();
    window.addEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);

    renderWithProviders(<SettingsSystemSection controller={controller} />);
    fireEvent.click(screen.getByRole('button', { name: 'Revision history' }));
    await waitFor(() => {
      expect(dashboardProfileServiceMocks.loadDashboardProfileHistory).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Restore revision 3?' })).getByRole('button', {
        name: 'Restore',
      })
    );

    await waitFor(() => {
      expect(dashboardProfileServiceMocks.loadDashboardProfileHistory).toHaveBeenCalledTimes(2);
      expect(refreshListener).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByText(
        'The dashboard changed before the restore finished. Refresh the history and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Restore revision 3?' })).not.toBeInTheDocument();

    window.removeEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);
  });

  it('does not offer shared revision history when this dashboard is local only', () => {
    useDashboardProfileRuntimeStore.getState().markDisabled();

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Local only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revision history' })).not.toBeInTheDocument();
  });

  it('offers a manual recovery action when dashboard sync needs attention', () => {
    useDashboardProfileRuntimeStore
      .getState()
      .markError('Shared dashboard sync is unavailable. Local settings are preserved.');
    const refreshListener = vi.fn();
    window.addEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);

    renderWithProviders(<SettingsSystemSection controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
    expect(refreshListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, refreshListener);
  });

  it('lists another dashboard without exposing a cross-browser removal control', () => {
    const currentClient = useDashboardProfileRuntimeStore.getState().client;
    expect(currentClient).not.toBeNull();
    if (!currentClient) return;

    useDashboardProfileRuntimeStore.getState().setClients([
      {
        id: currentClient.id,
        name: currentClient.name,
        kind: currentClient.kind,
        firstSeenAt: '2026-07-25T08:00:00.000Z',
        lastSeenAt: '2026-07-25T08:00:00.000Z',
        lastRevision: 5,
      },
      {
        id: 'kitchen_panel',
        name: 'Kitchen panel',
        kind: 'wall_panel',
        firstSeenAt: '2026-07-24T08:00:00.000Z',
        lastSeenAt: '2026-07-25T09:00:00.000Z',
        lastRevision: 5,
      },
    ]);
    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Kitchen panel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove device' })).not.toBeInTheDocument();
    expect(dashboardProfileServiceMocks.forgetDashboardProfileClient).not.toHaveBeenCalled();
  });
});
