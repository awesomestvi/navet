import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addCameraWebRtcCandidateMock,
  dispatchEntityActionMock,
  disableCameraMotionDetectionMock,
  enableCameraMotionDetectionMock,
  getCameraCapabilitiesMock,
  getCameraStreamUrlMock,
  getWebRtcClientConfigurationMock,
  subscribeCameraWebRtcOfferMock,
} = vi.hoisted(() => ({
  addCameraWebRtcCandidateMock: vi.fn(),
  dispatchEntityActionMock: vi.fn(),
  disableCameraMotionDetectionMock: vi.fn(),
  enableCameraMotionDetectionMock: vi.fn(),
  getCameraCapabilitiesMock: vi.fn(),
  getCameraStreamUrlMock: vi.fn(),
  getWebRtcClientConfigurationMock: vi.fn(),
  subscribeCameraWebRtcOfferMock: vi.fn(),
}));

vi.mock('../integration-action.service', () => ({
  dispatchEntityAction: dispatchEntityActionMock,
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    addCameraWebRtcCandidate: addCameraWebRtcCandidateMock,
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
    disableCameraMotionDetectionMock.mockReset();
    dispatchEntityActionMock.mockReset();
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

    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(1, {
      entityId: 'switch.camera_motion',
      domain: 'switch',
      service: 'turn_off',
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(2, {
      entityId: 'select.camera_ir_mode',
      domain: 'select',
      service: 'select_option',
      serviceData: { option: 'auto' },
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(3, {
      entityId: 'number.camera_brightness',
      domain: 'number',
      service: 'set_value',
      serviceData: { value: 55 },
    });
  });
});
