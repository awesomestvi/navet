import { cameraEntityFactory } from '../entities/camera';

export const onvifFixtures = {
  camera: cameraEntityFactory({
    friendly_name: 'ONVIF Gate Camera',
    entity_picture: '/api/camera_proxy/camera.gate',
  }),
  hlsStreamUrl: 'https://ha.example.test/api/hls/camera.gate/master.m3u8',
};
