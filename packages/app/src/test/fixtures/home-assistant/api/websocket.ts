export const homeAssistantWebSocketFixtures = {
  authRequired: { type: 'auth_required', ha_version: '2026.5.0' },
  authOk: { type: 'auth_ok', ha_version: '2026.5.0' },
  authInvalid: { type: 'auth_invalid', message: 'Invalid access token or password' },
  ping: { id: 1, type: 'ping' },
  pong: { id: 1, type: 'pong' },
  cameraThumbnailResult: {
    id: 10,
    type: 'result',
    success: true,
    result: {
      content_type: 'image/jpeg',
      content: 'base64-jpeg-thumbnail',
    },
  },
  cameraCapabilitiesResult: {
    id: 12,
    type: 'result',
    success: true,
    result: {
      frontend_stream_types: ['hls', 'web_rtc'],
    },
  },
  cameraStreamResult: {
    id: 13,
    type: 'result',
    success: true,
    result: {
      url: '/api/hls/camera.front/master.m3u8',
    },
  },
  cameraStreamPathsResult: {
    id: 15,
    type: 'result',
    success: true,
    result: {
      hls_path: '/api/hls/camera.front/master.m3u8',
      mjpeg_path: '/api/camera_proxy_stream/camera.front',
    },
  },
  webRtcClientConfigResult: {
    id: 14,
    type: 'result',
    success: true,
    result: {
      configuration: {
        iceServers: [],
      },
    },
  },
  signedPathResult: {
    id: 11,
    type: 'result',
    success: true,
    result: {
      path: '/api/image/serve/image-id/512x512?authSig=signed-image-token',
    },
  },
};
