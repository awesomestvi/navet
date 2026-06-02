import { describe, expect, it, vi } from 'vitest';
import { homeAssistantCameraFeatureService } from './homeassistant-camera-feature.service';

const bridgeMocks = vi.hoisted(() => ({
  addCandidateMock: vi.fn(),
  callServiceMock: vi.fn(),
  disableMotionMock: vi.fn(),
  enableMotionMock: vi.fn(),
  getCapabilitiesMock: vi.fn(),
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
  getHomeAssistantCameraStreamUrl: bridgeMocks.getStreamUrlMock,
  getHomeAssistantWebRtcClientConfiguration: bridgeMocks.getWebRtcConfigMock,
  subscribeHomeAssistantCameraWebRtcOffer: bridgeMocks.subscribeOfferMock,
}));

describe('homeAssistantCameraFeatureService', () => {
  it('refreshes camera snapshots by requesting a Home Assistant entity update', async () => {
    await homeAssistantCameraFeatureService.refreshCameraSnapshot?.('camera.front');

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
});
