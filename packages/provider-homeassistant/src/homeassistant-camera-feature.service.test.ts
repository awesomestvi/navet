import { createProviderScopedId } from '@navet/core/ids';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantCameraFeatureService } from './homeassistant-camera-feature.service';

const bridgeMocks = vi.hoisted(() => ({
  addCandidateMock: vi.fn(),
  callServiceMock: vi.fn(),
  disableMotionMock: vi.fn(),
  enableMotionMock: vi.fn(),
  getCapabilitiesMock: vi.fn(),
  getStreamPathsMock: vi.fn(),
  getStreamUrlMock: vi.fn(),
  getWebRtcConfigMock: vi.fn(),
  subscribeOfferMock: vi.fn(),
}));

vi.mock('./homeassistant-service-bridge', () => ({
  addHomeAssistantCameraWebRtcCandidate: bridgeMocks.addCandidateMock,
  callHomeAssistantService: bridgeMocks.callServiceMock,
  disableHomeAssistantCameraMotionDetection: bridgeMocks.disableMotionMock,
  enableHomeAssistantCameraMotionDetection: bridgeMocks.enableMotionMock,
  getHomeAssistantCameraCapabilities: bridgeMocks.getCapabilitiesMock,
  getHomeAssistantCameraStreamPaths: bridgeMocks.getStreamPathsMock,
  getHomeAssistantCameraStreamUrl: bridgeMocks.getStreamUrlMock,
  getHomeAssistantWebRtcClientConfiguration: bridgeMocks.getWebRtcConfigMock,
  subscribeHomeAssistantCameraWebRtcOffer: bridgeMocks.subscribeOfferMock,
}));

describe('homeAssistantCameraFeatureService', () => {
  beforeEach(() => {
    for (const mock of Object.values(bridgeMocks)) {
      mock.mockReset();
    }
  });

  it('returns advertised transports without waiting for optional stream paths', async () => {
    bridgeMocks.getCapabilitiesMock.mockResolvedValueOnce({ frontend_stream_types: ['hls'] });

    await expect(
      homeAssistantCameraFeatureService.getCameraCapabilities('camera.front')
    ).resolves.toEqual({
      streamTypes: ['hls'],
    });
    expect(bridgeMocks.getStreamPathsMock).not.toHaveBeenCalled();
  });

  it('deduplicates supported stream types and ignores malformed capability values', async () => {
    bridgeMocks.getCapabilitiesMock.mockResolvedValueOnce({
      frontend_stream_types: ['web_rtc', 'hls', 'web_rtc', 'mjpeg', 'mp4', null],
    });

    await expect(
      homeAssistantCameraFeatureService.getCameraCapabilities('camera.front')
    ).resolves.toEqual({
      streamTypes: ['web_rtc', 'hls'],
    });
  });

  it('falls back to the direct camera proxy stream path when Home Assistant does not support stream_camera', async () => {
    bridgeMocks.getStreamPathsMock.mockRejectedValueOnce(new Error('unknown_command'));

    await expect(
      homeAssistantCameraFeatureService.getCameraStreamPaths?.('camera.front')
    ).resolves.toEqual({
      mjpeg: '/api/camera_proxy_stream/camera.front',
    });
  });

  it('defaults direct stream URL requests to HLS and rejects WebRTC', async () => {
    bridgeMocks.getStreamUrlMock.mockResolvedValueOnce({
      url: '/api/hls/camera.front/master.m3u8',
    });

    await expect(
      homeAssistantCameraFeatureService.getCameraStreamUrl('camera.front')
    ).resolves.toEqual({
      url: '/api/hls/camera.front/master.m3u8',
    });
    expect(bridgeMocks.getStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');

    await expect(
      homeAssistantCameraFeatureService.getCameraStreamUrl('camera.front', 'web_rtc')
    ).rejects.toThrow('Home Assistant does not expose a direct web_rtc stream URL');

    expect(bridgeMocks.getStreamUrlMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes camera snapshots by requesting a Home Assistant entity update', async () => {
    await homeAssistantCameraFeatureService.refreshCameraSnapshot?.(
      createProviderScopedId('home_assistant', 'camera.front')
    );

    expect(bridgeMocks.callServiceMock).toHaveBeenCalledWith(
      'homeassistant',
      'update_entity',
      {},
      { entityId: 'camera.front' }
    );
  });

  it('forwards Home Assistant WebRTC candidate and error events', async () => {
    const callback = vi.fn();
    bridgeMocks.subscribeOfferMock.mockImplementationOnce(
      async (_entityId: string, _offer: string, listener: (event: unknown) => void) => {
        listener({ session_id: 'session-1' });
        listener({ answer: 'answer-sdp' });
        listener({ candidate: { candidate: 'candidate:1', sdpMid: '0' } });
        listener({ code: 'webrtc_failed', message: 'ICE negotiation failed' });
        return () => undefined;
      }
    );

    await homeAssistantCameraFeatureService.subscribeCameraWebRtcOffer(
      'camera.front',
      'offer-sdp',
      callback
    );

    expect(callback).toHaveBeenNthCalledWith(1, {
      type: 'session',
      session_id: 'session-1',
    });
    expect(callback).toHaveBeenNthCalledWith(2, {
      type: 'answer',
      answer: 'answer-sdp',
    });
    expect(callback).toHaveBeenNthCalledWith(3, {
      type: 'candidate',
      candidate: { candidate: 'candidate:1', sdpMid: '0' },
    });
    expect(callback).toHaveBeenNthCalledWith(4, {
      type: 'error',
      code: 'webrtc_failed',
      message: 'ICE negotiation failed',
    });
  });

  it('emits the session before the answer when Home Assistant combines both events', async () => {
    const callback = vi.fn();
    bridgeMocks.subscribeOfferMock.mockImplementationOnce(
      async (_entityId: string, _offer: string, listener: (event: unknown) => void) => {
        listener({ answer: 'answer-sdp', session_id: 'session-1' });
        return () => undefined;
      }
    );

    await homeAssistantCameraFeatureService.subscribeCameraWebRtcOffer(
      'camera.front',
      'offer-sdp',
      callback
    );

    expect(callback).toHaveBeenNthCalledWith(1, {
      type: 'session',
      session_id: 'session-1',
    });
    expect(callback).toHaveBeenNthCalledWith(2, {
      type: 'answer',
      answer: 'answer-sdp',
    });
  });

  it('normalizes provider-scoped camera IDs for Home Assistant stream and WebRTC requests', async () => {
    bridgeMocks.getCapabilitiesMock.mockResolvedValueOnce({ frontend_stream_types: ['hls'] });
    bridgeMocks.getStreamUrlMock.mockResolvedValueOnce({
      url: '/api/hls/camera.front/master.m3u8',
    });
    bridgeMocks.getStreamPathsMock.mockResolvedValueOnce({
      mjpeg: '/api/camera_proxy_stream/camera.front',
    });
    bridgeMocks.getWebRtcConfigMock.mockResolvedValueOnce({ configuration: {} });
    const entityId = createProviderScopedId('home_assistant', 'camera.front');

    await homeAssistantCameraFeatureService.getCameraCapabilities(entityId);
    await homeAssistantCameraFeatureService.getCameraStreamUrl(entityId, 'hls');
    await homeAssistantCameraFeatureService.getWebRtcClientConfiguration(entityId);
    await homeAssistantCameraFeatureService.addCameraWebRtcCandidate(entityId, 'session-1', {
      candidate: 'candidate:1',
      sdpMid: '0',
    });

    expect(bridgeMocks.getCapabilitiesMock).toHaveBeenCalledWith('camera.front');
    expect(bridgeMocks.getStreamPathsMock).not.toHaveBeenCalled();
    expect(bridgeMocks.getStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');
    expect(bridgeMocks.getWebRtcConfigMock).toHaveBeenCalledWith('camera.front');
    expect(bridgeMocks.addCandidateMock).toHaveBeenCalledWith('camera.front', 'session-1', {
      candidate: 'candidate:1',
      sdpMid: '0',
    });
  });
});
