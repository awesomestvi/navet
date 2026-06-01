import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import type { SettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSystemSection } from '../settings-system-section';

function createController(): SettingsSectionController {
  return {
    activeProviderId: 'home_assistant',
    config: { url: 'https://ha.example.com' },
    confirmLogout: vi.fn(),
    customPrimaryColor: null,
    disableAnimations: false,
    effectsQuality: 'high',
    entityInteractionMode: 'toggle-first',
    followSystemTheme: false,
    setFollowSystemTheme: vi.fn(),
    handleConnectProvider: vi.fn(),
    handleDisconnectProvider: vi.fn(),
    handleExportDashboardConfig: vi.fn(),
    handleImportDashboardConfig: vi.fn(),
    handleLogout: vi.fn(),
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
    cameraGo2RtcDefaults: { serverUrl: '', streamNameStrategy: 'entity-id' },
  } as unknown as SettingsSectionController;
}

describe('SettingsSystemSection', () => {
  let controller: SettingsSectionController;

  beforeEach(() => {
    controller = createController();
  });

  it('shows connected providers immediately and keeps disconnected ones in provider management', () => {
    renderWithProviders(<SettingsSystemSection controller={controller} />);

    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Home Assistant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage 2 other providers' })).toBeInTheDocument();
    expect(screen.queryByText('openHAB')).not.toBeInTheDocument();
    expect(screen.getByText('Camera live streams')).toBeInTheDocument();

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
    fireEvent.change(screen.getByPlaceholderText('openHAB Username'), {
      target: { value: 'navet' },
    });
    fireEvent.change(screen.getByPlaceholderText('openHAB Password'), {
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
});
