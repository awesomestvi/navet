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

  it('plays media through the Home Assistant media selector payload', async () => {
    const connection = { id: 'connection' };
    const service = new HAEntityService(() => connection as never);

    await service.playMedia('media_player.spotify', {
      mediaContentId: 'spotify:playlist:daily-mix',
      mediaContentType: 'playlist',
      enqueue: 'replace',
      announce: true,
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      connection,
      'media_player',
      'play_media',
      {
        entity_id: 'media_player.spotify',
        media: {
          media_content_id: 'spotify:playlist:daily-mix',
          media_content_type: 'playlist',
        },
        enqueue: 'replace',
        announce: true,
      },
      { entity_id: 'media_player.spotify' }
    );
  });

  it('seeks, selects sound mode, and clears playlist through media player services', async () => {
    const connection = { id: 'connection' };
    const service = new HAEntityService(() => connection as never);

    await service.seekMediaPlayer('media_player.living_room', 42);
    await service.selectMediaPlayerSoundMode('media_player.living_room', 'Movie');
    await service.clearMediaPlayerPlaylist('media_player.living_room');

    expect(callServiceMock).toHaveBeenNthCalledWith(
      1,
      connection,
      'media_player',
      'media_seek',
      {
        entity_id: 'media_player.living_room',
        seek_position: 42,
      },
      { entity_id: 'media_player.living_room' }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      2,
      connection,
      'media_player',
      'select_sound_mode',
      {
        entity_id: 'media_player.living_room',
        sound_mode: 'Movie',
      },
      { entity_id: 'media_player.living_room' }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      3,
      connection,
      'media_player',
      'clear_playlist',
      { entity_id: 'media_player.living_room' },
      { entity_id: 'media_player.living_room' }
    );
  });

  it('requests browse and search media responses over websocket', async () => {
    const browseResponse = { response: { title: 'Library', children: [] } };
    const searchResponse = { response: { title: 'Search', children: [] } };
    const sendMessagePromise = vi
      .fn()
      .mockResolvedValueOnce(browseResponse)
      .mockResolvedValueOnce(searchResponse);
    const service = new HAEntityService(() => ({ sendMessagePromise }) as never);

    await expect(service.browseMediaPlayer('media_player.browse')).resolves.toEqual(
      browseResponse.response
    );
    await expect(service.searchMediaPlayer('media_player.search', 'Beatles')).resolves.toEqual(
      searchResponse.response
    );

    expect(sendMessagePromise).toHaveBeenNthCalledWith(1, {
      type: 'call_service',
      domain: 'media_player',
      service: 'browse_media',
      service_data: {},
      target: { entity_id: 'media_player.browse' },
      return_response: true,
    });
    expect(sendMessagePromise).toHaveBeenNthCalledWith(2, {
      type: 'call_service',
      domain: 'media_player',
      service: 'search_media',
      service_data: { search_query: 'Beatles' },
      target: { entity_id: 'media_player.search' },
      return_response: true,
    });
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
