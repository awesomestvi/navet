import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMissingIntegrationCapabilityError,
  getIntegrationProviderAdapter,
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
  },
}));

vi.mock('../homey.service', () => ({
  homeyService: {
    callService: homeyCallServiceMock,
  },
}));

describe('integration-registry.service', () => {
  beforeEach(() => {
    callServiceMock.mockReset();
    getCameraStreamUrlMock.mockReset();
    signPathMock.mockReset();
    homeyCallServiceMock.mockReset();
  });

  it('lists all available providers and marks Home Assistant and Homey as implemented', () => {
    expect(listAvailableIntegrationProviders().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
      'openhab',
    ]);
    expect(listImplementedIntegrationProviders().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
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
    });

    signPathMock.mockResolvedValue({ path: '/signed/test' });
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/test.m3u8' });

    await expect(adapter.signPath?.('/api/test', 10)).resolves.toBe('/signed/test');
    await expect(adapter.getCameraStream?.('camera.front', 'hls')).resolves.toEqual({
      url: '/api/hls/test.m3u8',
    });
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
    });
    expect(adapter.callService).toBeDefined();
    expect(adapter.signPath).toBeUndefined();
    expect(adapter.getCameraStream).toBeUndefined();

    await adapter.callService?.('switch', 'turn_on', {}, { entity_id: 'device-1' });
    expect(homeyCallServiceMock).toHaveBeenCalledWith(
      'switch',
      'turn_on',
      {},
      {
        entity_id: 'device-1',
      }
    );

    expect(createMissingIntegrationCapabilityError(adapter, 'pathSigning')).toMatchObject({
      message: 'Path signing is not implemented yet for provider Homey',
    });
  });
});
