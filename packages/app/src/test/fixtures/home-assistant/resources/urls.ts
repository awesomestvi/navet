export const homeAssistantUrlFixtures = {
  relativeMediaArtwork: '/api/media_player_proxy/media_player.living_room',
  relativeCameraSnapshot: '/api/camera_proxy/camera.front_door',
  relativeImageServe: '/api/image/serve/image-id/512x512',
  relativeHlsStream: '/api/hls/camera.front_door/master.m3u8',
  staleProxyMediaArtwork: '/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room',
  staleProxyCameraSnapshot: '/__navet_ha_proxy__/api/camera_proxy/camera.front_door',
  signedImageServe: '/api/image/serve/image-id/512x512?authSig=signed-image-token',
  absoluteHaMediaArtwork: 'https://ha.example.test/api/media_player_proxy/media_player.living_room',
  absoluteHaSignedImage:
    'https://ha.example.test/api/image/serve/image-id/512x512?authSig=signed-image-token',
  absoluteIngressProxyMediaArtwork:
    'https://ha.example.test/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room',
  crossOriginExternalImage: 'https://cdn.example.test/album-art.jpg',
  unsafeJavascriptUrl: 'javascript:alert(1)',
  ingressBasePath: '/api/hassio_ingress/navet_dev',
};
