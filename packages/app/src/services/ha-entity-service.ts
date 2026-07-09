import { type Connection, callService as callHassService } from 'home-assistant-js-websocket';

import type {
  HomeAssistantAutomationConfig,
  HomeAssistantCameraCapabilities,
  HomeAssistantCameraStream,
  HomeAssistantCameraStreamPaths,
  HomeAssistantCameraStreamType,
  HomeAssistantMediaBrowseResult,
  HomeAssistantMediaSearchResult,
  HomeAssistantMediaSourceItem,
  HomeAssistantResolvedMediaSource,
  HomeAssistantWebRtcClientConfiguration,
  HomeAssistantWebRtcOfferEvent,
} from './home-assistant.service';

type HAServiceTarget = {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
};

type HAServiceCaller = (
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
  target?: HAServiceTarget
) => Promise<void>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaBrowseResult(value: unknown): value is HomeAssistantMediaBrowseResult {
  return (
    isObjectRecord(value) &&
    (typeof value.title === 'string' ||
      Array.isArray(value.children) ||
      typeof value.media_content_id === 'string')
  );
}

function normalizeMediaBrowseServiceResponse(
  response: unknown,
  entityId: string
): HomeAssistantMediaBrowseResult {
  const payload = isObjectRecord(response) && 'response' in response ? response.response : response;

  if (isMediaBrowseResult(payload)) {
    return payload;
  }

  if (isObjectRecord(payload)) {
    const targetedResult = payload[entityId];
    if (isMediaBrowseResult(targetedResult)) {
      return targetedResult;
    }
  }

  return {};
}

function isUnknownHomeAssistantCommandError(error: unknown): boolean {
  return (
    isObjectRecord(error) &&
    typeof error.code === 'string' &&
    (error.code === 'unknown_command' || error.code === 'not_supported')
  );
}

/**
 * Provides domain-specific Home Assistant service calls for entity control.
 * Handles lights, switches, climate, media players, cameras, locks, vacuums, and covers.
 */
class HAEntityService {
  constructor(
    private connection: () => Connection | null,
    private serviceCaller?: HAServiceCaller
  ) {}

  /**
   * Call a Home Assistant service over the active websocket connection.
   */
  private async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> = {},
    target?: {
      entity_id?: string | string[];
      area_id?: string | string[];
      device_id?: string | string[];
    }
  ): Promise<void> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    const normalizedServiceData = { ...serviceData };

    if (target?.entity_id && normalizedServiceData.entity_id === undefined) {
      normalizedServiceData.entity_id = target.entity_id;
    }
    if (target?.area_id && normalizedServiceData.area_id === undefined) {
      normalizedServiceData.area_id = target.area_id;
    }
    if (target?.device_id && normalizedServiceData.device_id === undefined) {
      normalizedServiceData.device_id = target.device_id;
    }

    if (this.serviceCaller) {
      await this.serviceCaller(domain, service, normalizedServiceData, target);
      return;
    }

    await callHassService(conn, domain, service, normalizedServiceData, target);
  }

  /**
   * Update a light entity using Home Assistant light services.
   */
  async updateLight(
    entityId: string,
    options: {
      state?: 'on' | 'off';
      brightnessPct?: number;
      kelvin?: number;
      rgbColor?: [number, number, number];
      hsColor?: [number, number];
      xyColor?: [number, number];
      effect?: string;
    }
  ): Promise<void> {
    const { state = 'on', brightnessPct, kelvin, rgbColor, hsColor, xyColor, effect } = options;

    if (state === 'off') {
      await this.callService('light', 'turn_off', {}, { entity_id: entityId });
      return;
    }

    const serviceData: Record<string, unknown> = {};
    if (typeof brightnessPct === 'number') {
      serviceData.brightness_pct = Math.max(1, Math.min(100, Math.round(brightnessPct)));
    }
    if (typeof kelvin === 'number') {
      serviceData.color_temp_kelvin = Math.max(2000, Math.min(6500, Math.round(kelvin)));
    }
    if (rgbColor) {
      serviceData.rgb_color = rgbColor;
    }
    if (hsColor) {
      serviceData.hs_color = [
        Math.max(0, Math.min(360, hsColor[0])),
        Math.max(0, Math.min(100, hsColor[1])),
      ];
    }
    if (xyColor) {
      serviceData.xy_color = [
        Math.max(0, Math.min(1, xyColor[0])),
        Math.max(0, Math.min(1, xyColor[1])),
      ];
    }
    if (typeof effect === 'string' && effect.trim().length > 0) {
      serviceData.effect = effect.trim();
    }

    await this.callService('light', 'turn_on', serviceData, { entity_id: entityId });
  }

  /**
   * Update a switch entity using Home Assistant switch services.
   */
  async updateSwitch(entityId: string, state: 'on' | 'off'): Promise<void> {
    await this.callService(
      'switch',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entityId }
    );
  }

  async updateLock(entityId: string, state: 'locked' | 'unlocked'): Promise<void> {
    await this.callService(
      'lock',
      state === 'locked' ? 'lock' : 'unlock',
      {},
      { entity_id: entityId }
    );
  }

  async setClimateTemperature(entityId: string, temperature: number): Promise<void> {
    const domain = entityId.startsWith('water_heater.') ? 'water_heater' : 'climate';
    await this.callService(domain, 'set_temperature', { temperature }, { entity_id: entityId });
  }

  async setClimateHvacMode(entityId: string, hvacMode: string): Promise<void> {
    if (entityId.startsWith('water_heater.')) {
      await this.callService(
        'water_heater',
        'set_operation_mode',
        { operation_mode: hvacMode },
        { entity_id: entityId }
      );
      return;
    }

    await this.callService(
      'climate',
      'set_hvac_mode',
      { hvac_mode: hvacMode },
      { entity_id: entityId }
    );
  }

  async updateMediaPlayerPlayback(
    entityId: string,
    action: 'toggle' | 'play' | 'pause' | 'previous' | 'next'
  ): Promise<void> {
    const service =
      action === 'toggle'
        ? 'media_play_pause'
        : action === 'play'
          ? 'media_play'
          : action === 'pause'
            ? 'media_pause'
            : action === 'previous'
              ? 'media_previous_track'
              : 'media_next_track';

    await this.callService('media_player', service, {}, { entity_id: entityId });
  }

  async setMediaPlayerVolume(entityId: string, volumePct: number): Promise<void> {
    const volumeLevel = Math.max(0, Math.min(1, volumePct / 100));
    await this.callService(
      'media_player',
      'volume_set',
      { volume_level: volumeLevel },
      { entity_id: entityId }
    );
  }

  async setMediaPlayerMute(entityId: string, isMuted: boolean): Promise<void> {
    await this.callService(
      'media_player',
      'volume_mute',
      { is_volume_muted: isMuted },
      { entity_id: entityId }
    );
  }

  async updateMediaPlayerPower(entityId: string, state: 'on' | 'off'): Promise<void> {
    await this.callService(
      'media_player',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entityId }
    );
  }

  async selectMediaPlayerSource(entityId: string, source: string): Promise<void> {
    await this.callService('media_player', 'select_source', { source }, { entity_id: entityId });
  }

  async playMedia(
    entityId: string,
    media: {
      mediaContentId: string;
      mediaContentType: string;
      enqueue?: 'play' | 'next' | 'add' | 'replace';
      announce?: boolean;
    }
  ): Promise<void> {
    const serviceData: Record<string, unknown> = {
      media_content_id: media.mediaContentId,
      media_content_type: media.mediaContentType,
    };
    if (media.enqueue) {
      serviceData.enqueue = media.enqueue;
    }
    if (typeof media.announce === 'boolean') {
      serviceData.announce = media.announce;
    }

    await this.callService('media_player', 'play_media', serviceData, { entity_id: entityId });
  }

  async browseMediaPlayer(
    entityId: string,
    media: { mediaContentId?: string; mediaContentType?: string } = {}
  ): Promise<HomeAssistantMediaBrowseResult> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    const command: {
      type: string;
      entity_id: string;
      media_content_id?: string;
      media_content_type?: string;
    } = {
      type: 'media_player/browse_media',
      entity_id: entityId,
    };
    if (media.mediaContentId) command.media_content_id = media.mediaContentId;
    if (media.mediaContentType) command.media_content_type = media.mediaContentType;

    try {
      return normalizeMediaBrowseServiceResponse(await conn.sendMessagePromise(command), entityId);
    } catch (error) {
      if (!isUnknownHomeAssistantCommandError(error)) {
        throw error;
      }
    }

    const serviceData: Record<string, unknown> = {};
    if (media.mediaContentId) serviceData.media_content_id = media.mediaContentId;
    if (media.mediaContentType) serviceData.media_content_type = media.mediaContentType;

    const response = await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'media_player',
      service: 'browse_media',
      service_data: serviceData,
      target: { entity_id: entityId },
      return_response: true,
    });

    return normalizeMediaBrowseServiceResponse(response, entityId);
  }

  async searchMediaPlayer(
    entityId: string,
    query: string,
    media: { mediaContentId?: string; mediaContentType?: string } = {}
  ): Promise<HomeAssistantMediaSearchResult> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    const command: {
      type: string;
      entity_id: string;
      search_query: string;
      media_content_id?: string;
      media_content_type?: string;
    } = {
      type: 'media_player/search_media',
      entity_id: entityId,
      search_query: query,
    };
    if (media.mediaContentId) command.media_content_id = media.mediaContentId;
    if (media.mediaContentType) command.media_content_type = media.mediaContentType;

    try {
      return normalizeMediaBrowseServiceResponse(
        await conn.sendMessagePromise(command),
        entityId
      ) as HomeAssistantMediaSearchResult;
    } catch (error) {
      if (!isUnknownHomeAssistantCommandError(error)) {
        throw error;
      }
    }

    const serviceData: Record<string, unknown> = { search_query: query };
    if (media.mediaContentId) serviceData.media_content_id = media.mediaContentId;
    if (media.mediaContentType) serviceData.media_content_type = media.mediaContentType;

    const response = await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'media_player',
      service: 'search_media',
      service_data: serviceData,
      target: { entity_id: entityId },
      return_response: true,
    });

    return normalizeMediaBrowseServiceResponse(
      response,
      entityId
    ) as HomeAssistantMediaSearchResult;
  }

  async seekMediaPlayer(entityId: string, seekPosition: number): Promise<void> {
    await this.callService(
      'media_player',
      'media_seek',
      { seek_position: Math.max(0, seekPosition) },
      { entity_id: entityId }
    );
  }

  async selectMediaPlayerSoundMode(entityId: string, soundMode: string): Promise<void> {
    await this.callService(
      'media_player',
      'select_sound_mode',
      { sound_mode: soundMode },
      { entity_id: entityId }
    );
  }

  async clearMediaPlayerPlaylist(entityId: string): Promise<void> {
    await this.callService('media_player', 'clear_playlist', {}, { entity_id: entityId });
  }

  async sendRemoteCommand(entityId: string, command: string | string[]): Promise<void> {
    await this.callService('remote', 'send_command', { command }, { entity_id: entityId });
  }

  async setMediaPlayerShuffle(entityId: string, shuffle: boolean): Promise<void> {
    await this.callService('media_player', 'shuffle_set', { shuffle }, { entity_id: entityId });
  }

  async setMediaPlayerRepeat(entityId: string, repeat: 'off' | 'one' | 'all'): Promise<void> {
    await this.callService('media_player', 'repeat_set', { repeat }, { entity_id: entityId });
  }

  async joinMediaPlayers(entityId: string, memberEntityIds: string[]): Promise<void> {
    await this.callService(
      'media_player',
      'join',
      { group_members: memberEntityIds },
      { entity_id: entityId }
    );
  }

  async unjoinMediaPlayer(entityId: string): Promise<void> {
    await this.callService('media_player', 'unjoin', {}, { entity_id: entityId });
  }

  /**
   * Turn a camera entity on or off.
   */
  async updateCamera(entityId: string, state: 'on' | 'off'): Promise<void> {
    await this.callService(
      'camera',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entityId }
    );
  }

  async enableCameraMotionDetection(entityId: string): Promise<void> {
    await this.callService('camera', 'enable_motion_detection', {}, { entity_id: entityId });
  }

  async disableCameraMotionDetection(entityId: string): Promise<void> {
    await this.callService('camera', 'disable_motion_detection', {}, { entity_id: entityId });
  }

  async playCameraStream(entityId: string, mediaPlayerId: string): Promise<void> {
    await this.callService(
      'camera',
      'play_stream',
      { media_player: mediaPlayerId, format: 'hls' },
      { entity_id: entityId }
    );
  }

  async getCameraCapabilities(entityId: string): Promise<HomeAssistantCameraCapabilities> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'camera/capabilities',
      entity_id: entityId,
    }) as Promise<HomeAssistantCameraCapabilities>;
  }

  async getCameraStreamUrl(
    entityId: string,
    format: HomeAssistantCameraStreamType = 'hls'
  ): Promise<HomeAssistantCameraStream> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'camera/stream',
      entity_id: entityId,
      format,
    }) as Promise<HomeAssistantCameraStream>;
  }

  async getCameraStreamPaths(entityId: string): Promise<HomeAssistantCameraStreamPaths> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'stream_camera',
      data: {
        camera_entity_id: entityId,
      },
    }) as Promise<HomeAssistantCameraStreamPaths>;
  }

  async getWebRtcClientConfiguration(
    entityId: string
  ): Promise<HomeAssistantWebRtcClientConfiguration> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'camera/webrtc/get_client_config',
      entity_id: entityId,
    }) as Promise<HomeAssistantWebRtcClientConfiguration>;
  }

  subscribeCameraWebRtcOffer(
    entityId: string,
    offer: string,
    callback: (event: HomeAssistantWebRtcOfferEvent) => void
  ): Promise<() => void> {
    const conn = this.connection();
    if (!conn) {
      return Promise.reject(new Error('Home Assistant is not connected'));
    }

    return conn.subscribeMessage(callback, {
      type: 'camera/webrtc/offer',
      entity_id: entityId,
      offer,
    });
  }

  async addCameraWebRtcCandidate(
    entityId: string,
    sessionId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    await conn.sendMessagePromise({
      type: 'camera/webrtc/candidate',
      entity_id: entityId,
      session_id: sessionId,
      candidate,
    });
  }

  /**
   * Browse media source
   */
  async browseMediaSource(mediaContentId: string): Promise<HomeAssistantMediaSourceItem> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'media_source/browse_media',
      media_content_id: mediaContentId,
    }) as Promise<HomeAssistantMediaSourceItem>;
  }

  /**
   * Resolve media source to get URL
   */
  async resolveMediaSource(mediaContentId: string): Promise<HomeAssistantResolvedMediaSource> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'media_source/resolve_media',
      media_content_id: mediaContentId,
    }) as Promise<HomeAssistantResolvedMediaSource>;
  }

  /**
   * Get automation config
   */
  async getAutomationConfig(entityId: string): Promise<HomeAssistantAutomationConfig> {
    const conn = this.connection();
    if (!conn) {
      throw new Error('Home Assistant is not connected');
    }

    return conn.sendMessagePromise({
      type: 'automation/config',
      entity_id: entityId,
    }) as Promise<HomeAssistantAutomationConfig>;
  }
}

export default HAEntityService;
