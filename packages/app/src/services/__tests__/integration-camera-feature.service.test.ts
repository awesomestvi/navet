import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addCameraWebRtcCandidateMock,
  callServiceMock,
  disableCameraMotionDetectionMock,
  enableCameraMotionDetectionMock,
  getCameraCapabilitiesMock,
  getCameraStreamUrlMock,
  getWebRtcClientConfigurationMock,
  subscribeCameraWebRtcOfferMock,
} = vi.hoisted(() => ({
  addCameraWebRtcCandidateMock: vi.fn(),
  callServiceMock: vi.fn(),
  disableCameraMotionDetectionMock: vi.fn(),
  enableCameraMotionDetectionMock: vi.fn(),
  getCameraCapabilitiesMock: vi.fn(),
  getCameraStreamUrlMock: vi.fn(),
  getWebRtcClientConfigurationMock: vi.fn(),
  subscribeCameraWebRtcOfferMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    addCameraWebRtcCandidate: addCameraWebRtcCandidateMock,
    callService: callServiceMock,
    disableCameraMotionDetection: disableCameraMotionDetectionMock,
    enableCameraMotionDetection: enableCameraMotionDetectionMock,
    getCameraCapabilities: getCameraCapabilitiesMock,
    getCameraStreamUrl: getCameraStreamUrlMock,
    getWebRtcClientConfiguration: getWebRtcClientConfigurationMock,
    subscribeCameraWebRtcOffer: subscribeCameraWebRtcOfferMock,
  },
}));

import { integrationCameraFeatureService } from '../integration-camera-feature.service';

describe('integrationCameraFeatureService', () => {
  beforeEach(() => {
    addCameraWebRtcCandidateMock.mockReset();
    callServiceMock.mockReset();
    disableCameraMotionDetectionMock.mockReset();
    enableCameraMotionDetectionMock.mockReset();
    getCameraCapabilitiesMock.mockReset();
    getCameraStreamUrlMock.mockReset();
    getWebRtcClientConfigurationMock.mockReset();
    subscribeCameraWebRtcOfferMock.mockReset();
  });

  it('routes camera accessory controls through provider intents', async () => {
    await integrationCameraFeatureService.toggleCameraAccessory('switch.camera_motion', 'off');
    await integrationCameraFeatureService.selectCameraAccessoryOption(
      'select.camera_ir_mode',
      'auto'
    );
    await integrationCameraFeatureService.setCameraAccessoryValue('number.camera_brightness', 55);

    expect(callServiceMock).toHaveBeenNthCalledWith(
      1,
      'switch',
      'turn_off',
      {},
      {
        entity_id: 'switch.camera_motion',
      }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      2,
      'select',
      'select_option',
      {
        option: 'auto',
      },
      {
        entity_id: 'select.camera_ir_mode',
      }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      3,
      'number',
      'set_value',
      {
        value: 55,
      },
      {
        entity_id: 'number.camera_brightness',
      }
    );
  });

  it('normalizes provider-scoped camera IDs for snapshot refresh and stream requests', async () => {
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });

    await integrationCameraFeatureService.refreshCameraSnapshot?.('home_assistant:camera.front');
    await integrationCameraFeatureService.getCameraStreamUrl('home_assistant:camera.front', 'hls');

    expect(callServiceMock).toHaveBeenCalledWith(
      'homeassistant',
      'update_entity',
      {},
      {
        entity_id: 'camera.front',
      }
    );
    expect(getCameraStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');
  });
});
