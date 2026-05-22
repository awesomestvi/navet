import { beforeEach, describe, expect, it, vi } from 'vitest';
import HAEntityService from '../ha-entity-service';

const { callServiceMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', () => ({
  callService: callServiceMock,
}));

describe('HAEntityService', () => {
  beforeEach(() => {
    callServiceMock.mockReset();
  });

  it('sets climate HVAC mode through the Home Assistant climate service', async () => {
    const connection = { id: 'connection' };
    const service = new HAEntityService(() => connection as never);

    await service.setClimateHvacMode('climate.hallway', 'heat');

    expect(callServiceMock).toHaveBeenCalledWith(
      connection,
      'climate',
      'set_hvac_mode',
      {
        entity_id: 'climate.hallway',
        hvac_mode: 'heat',
      },
      { entity_id: 'climate.hallway' }
    );
  });

  it('sets water heater operation mode through the Home Assistant water heater service', async () => {
    const connection = { id: 'connection' };
    const service = new HAEntityService(() => connection as never);

    await service.setClimateHvacMode('water_heater.boiler', 'eco');

    expect(callServiceMock).toHaveBeenCalledWith(
      connection,
      'water_heater',
      'set_operation_mode',
      {
        entity_id: 'water_heater.boiler',
        operation_mode: 'eco',
      },
      { entity_id: 'water_heater.boiler' }
    );
  });

  it('sets water heater temperature through the Home Assistant water heater service', async () => {
    const connection = { id: 'connection' };
    const service = new HAEntityService(() => connection as never);

    await service.setClimateTemperature('water_heater.boiler', 55);

    expect(callServiceMock).toHaveBeenCalledWith(
      connection,
      'water_heater',
      'set_temperature',
      {
        entity_id: 'water_heater.boiler',
        temperature: 55,
      },
      { entity_id: 'water_heater.boiler' }
    );
  });

  it('requests Home Assistant camera stream URLs over websocket', async () => {
    const sendMessagePromise = vi.fn(async () => ({ url: '/api/hls/camera.front/master.m3u8' }));
    const service = new HAEntityService(() => ({ sendMessagePromise }) as never);

    await expect(service.getCameraStreamUrl('camera.front')).resolves.toEqual({
      url: '/api/hls/camera.front/master.m3u8',
    });

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/stream',
      entity_id: 'camera.front',
      format: 'hls',
    });
  });

  it('requests Home Assistant WebRTC client configuration over websocket', async () => {
    const configuration = { iceServers: [] };
    const sendMessagePromise = vi.fn(async () => ({ configuration }));
    const service = new HAEntityService(() => ({ sendMessagePromise }) as never);

    await expect(service.getWebRtcClientConfiguration('camera.front')).resolves.toEqual({
      configuration,
    });

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/webrtc/get_client_config',
      entity_id: 'camera.front',
    });
  });

  it('subscribes to Home Assistant WebRTC offers over websocket', async () => {
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn(async () => unsubscribe);
    const service = new HAEntityService(() => ({ subscribeMessage }) as never);
    const callback = vi.fn();

    await expect(
      service.subscribeCameraWebRtcOffer('camera.front', 'offer-sdp', callback)
    ).resolves.toBe(unsubscribe);

    expect(subscribeMessage).toHaveBeenCalledWith(callback, {
      type: 'camera/webrtc/offer',
      entity_id: 'camera.front',
      offer: 'offer-sdp',
    });
  });

  it('sends Home Assistant WebRTC candidates over websocket', async () => {
    const sendMessagePromise = vi.fn(async () => undefined);
    const service = new HAEntityService(() => ({ sendMessagePromise }) as never);
    const candidate = { candidate: 'candidate:1', sdpMid: '0' };

    await service.addCameraWebRtcCandidate('camera.front', 'session-1', candidate);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/webrtc/candidate',
      entity_id: 'camera.front',
      session_id: 'session-1',
      candidate,
    });
  });
});
