import {
  expectProviderFeatureClaims,
  expectProviderFeatureMatrixSubset,
} from '@navet/app/test/provider-contract-assertions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMissingIntegrationCapabilityError,
  createMissingIntegrationFeatureError,
  getIntegrationProviderAdapter,
  getIntegrationProviderContract,
  getIntegrationProviderEnergyFeatureService,
  getIntegrationProviderFeatureMatrix,
  getSmartHomeProviderAdapter,
  listAvailableIntegrationProviders,
  listImplementedIntegrationProviders,
} from '../integration-registry.service';

const { callServiceMock, getCameraStreamUrlMock, signPathMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn(),
  getCameraStreamUrlMock: vi.fn(),
  signPathMock: vi.fn(),
}));

const { homeyCallServiceMock } = vi.hoisted(() => ({
  homeyCallServiceMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    callService: callServiceMock,
    signPath: signPathMock,
    getCameraStreamUrl: getCameraStreamUrlMock,
    isConnected: () => false,
    getEntities: () => ({}),
    getAreas: () => [],
    getDeviceRegistry: () => [],
    getEntityRegistry: () => [],
    addListener: () => () => {},
  },
}));

vi.mock('../homey.service', () => ({
  homeyService: {
    callService: homeyCallServiceMock,
    getSnapshot: () => ({
      connected: false,
      devices: {},
      zones: {},
    }),
    subscribe: () => () => {},
  },
}));

describe('integration-registry.service', () => {
  beforeEach(() => {
    callServiceMock.mockReset();
    getCameraStreamUrlMock.mockReset();
    signPathMock.mockReset();
    homeyCallServiceMock.mockReset();
  });

  it('lists all available providers and marks Home Assistant, Homey, and openHAB as implemented', () => {
    expect(listAvailableIntegrationProviders().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
      'openhab',
      'hubitat',
      'smartthings',
    ]);
    expect(listImplementedIntegrationProviders().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
      'openhab',
    ]);
  });

  it('exposes Home Assistant as a fully implemented adapter', async () => {
    const adapter = getIntegrationProviderAdapter('home_assistant');

    expect(adapter).toMatchObject({
      provider: {
        id: 'home_assistant',
        label: 'Home Assistant',
      },
      implementationStatus: 'implemented',
      capabilities: {
        serviceActions: true,
        pathSigning: true,
        cameraStreams: true,
      },
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
    });

    signPathMock.mockResolvedValue({ path: '/signed/test' });
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/test.m3u8' });

    await expect(adapter.signPath?.('/api/test', 10)).resolves.toBe('/signed/test');
    await expect(adapter.getCameraStream?.('camera.front', 'hls')).resolves.toEqual({
      url: '/api/hls/test.m3u8',
    });
    expect(getIntegrationProviderEnergyFeatureService('home_assistant')).toBe(
      adapter.energyFeatureService
    );
  });

  it('exposes Homey as an implemented adapter with service actions enabled', async () => {
    const adapter = getIntegrationProviderAdapter('homey');

    expect(adapter).toMatchObject({
      provider: {
        id: 'homey',
        label: 'Homey',
      },
      implementationStatus: 'implemented',
      capabilities: {
        serviceActions: true,
        pathSigning: false,
        cameraStreams: false,
      },
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
    });
    expect(adapter.invokeService).toBeDefined();
    expect(adapter.signPath).toBeUndefined();
    expect(adapter.getCameraStream).toBeUndefined();

    await adapter.invokeService?.('switch', 'turn_on', {}, { entityId: 'device-1' });
    expect(homeyCallServiceMock).toHaveBeenCalledWith(
      'switch',
      'turn_on',
      {},
      {
        entityId: 'device-1',
      }
    );

    expect(createMissingIntegrationCapabilityError(adapter, 'pathSigning')).toMatchObject({
      message: 'Path signing is not implemented yet for provider Homey',
    });
    expect(createMissingIntegrationFeatureError(adapter, 'mediaBrowse')).toMatchObject({
      message: 'Media browsing is not implemented yet for provider Homey',
    });
  });

  it('exposes provider feature matrices separately from low-level transport capabilities', () => {
    expectProviderFeatureMatrixSubset(getIntegrationProviderFeatureMatrix('home_assistant'), {
      mediaBrowse: true,
      notifications: true,
      energyNow: true,
    });
    expectProviderFeatureMatrixSubset(getIntegrationProviderFeatureMatrix('homey'), {
      lighting: true,
      sensors: true,
      rooms: true,
      mediaBrowse: false,
      notifications: false,
    });
    expectProviderFeatureClaims(getIntegrationProviderAdapter('homey'), {
      supported: ['rooms', 'lighting', 'sensors'],
      unsupported: ['mediaBrowse', 'notifications', 'calendar'],
    });
  });

  it('exposes a provider-contract compatibility adapter for implemented providers', async () => {
    const adapter = getSmartHomeProviderAdapter('home_assistant');

    await expect(adapter.listEntities()).resolves.toEqual(expect.any(Array));
    await expect(adapter.subscribeToEvents(() => undefined)).resolves.toEqual(expect.any(Function));
  });

  it('reuses the same provider contract instance for registry and compatibility adapter wiring', () => {
    expect(getIntegrationProviderAdapter('home_assistant').contract).toBe(
      getIntegrationProviderContract('home_assistant')
    );
    expect(getIntegrationProviderAdapter('homey').contract).toBe(
      getIntegrationProviderContract('homey')
    );
  });

  it('exposes planned providers through empty compatibility adapters and stable contract instances', async () => {
    const adapter = getIntegrationProviderAdapter('hubitat');
    const providerContractAdapter = getSmartHomeProviderAdapter('hubitat');
    const contract = getIntegrationProviderContract('hubitat');

    expect(adapter.implementationStatus).toBe('planned');
    expect(contract).toBe(getIntegrationProviderContract('hubitat'));
    expect(providerContractAdapter).toBe(getSmartHomeProviderAdapter('hubitat'));

    await expect(providerContractAdapter.listEntities()).resolves.toEqual([]);
    await expect(providerContractAdapter.getEntity('hubitat:light.kitchen')).resolves.toBeNull();
    await expect(contract.getState()).toEqual({
      providerId: 'hubitat',
      connected: false,
      entities: [],
      rooms: [],
    });
  });
});
