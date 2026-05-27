import { describe, expect, it, vi } from 'vitest';
import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import {
  getCurrentIntegrationCameraStream,
  getCurrentIntegrationProvider,
  getCurrentIntegrationProviderId,
  getCurrentIntegrationSession,
  listImplementedIntegrationProvidersForRuntime,
  listIntegrationRuntimeAdapters,
  listSupportedIntegrationProviders,
  signCurrentIntegrationPath,
} from '../integration-runtime.service';

const { getCameraStreamUrlMock, signPathMock } = vi.hoisted(() => ({
  getCameraStreamUrlMock: vi.fn(),
  signPathMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    signPath: signPathMock,
    getCameraStreamUrl: getCameraStreamUrlMock,
  },
}));

describe('integration-runtime.service', () => {
  it('defaults to Home Assistant as the current provider', () => {
    authSessionManager.replaceSession(null);

    expect(getCurrentIntegrationProviderId()).toBe('home_assistant');
    expect(getCurrentIntegrationProvider()).toMatchObject({
      id: 'home_assistant',
      label: 'Home Assistant',
    });
    expect(getCurrentIntegrationSession()).toBeNull();
  });

  it('reflects the active provider from the auth session manager', () => {
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    expect(getCurrentIntegrationSession()).toMatchObject({
      providerId: 'home_assistant',
      haBaseUrl: 'https://ha.example.com',
    });
  });

  it('lists supported provider definitions', () => {
    expect(listSupportedIntegrationProviders().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
      'openhab',
    ]);
  });

  it('lists implemented runtime providers separately from planned ones', () => {
    expect(listImplementedIntegrationProvidersForRuntime().map((provider) => provider.id)).toEqual([
      'home_assistant',
      'homey',
    ]);
  });

  it('exposes provider adapters including a Homey stub with capabilities', () => {
    expect(
      listIntegrationRuntimeAdapters().find((adapter) => adapter.provider.id === 'homey')
    ).toMatchObject({
      provider: {
        id: 'homey',
        label: 'Homey',
      },
      capabilities: {
        serviceActions: true,
        pathSigning: false,
        cameraStreams: false,
      },
    });
  });

  it('routes path signing through the current Home Assistant integration', async () => {
    signPathMock.mockResolvedValue({ path: '/signed/path' });

    await expect(signCurrentIntegrationPath('/api/camera_proxy/camera.front', 30)).resolves.toBe(
      '/signed/path'
    );
    expect(signPathMock).toHaveBeenCalledWith('/api/camera_proxy/camera.front', 30);
  });

  it('routes camera stream lookup through the current Home Assistant integration', async () => {
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/stream.m3u8' });

    await expect(getCurrentIntegrationCameraStream('camera.front', 'hls')).resolves.toEqual({
      url: '/api/hls/stream.m3u8',
    });
    expect(getCameraStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');
  });

  it('fails with a provider-specific message when a runtime capability is missing', async () => {
    authSessionManager.replaceSession({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
    });

    await expect(signCurrentIntegrationPath('/api/test')).rejects.toThrow(
      'Path signing is not implemented yet for provider Homey'
    );
  });
});
