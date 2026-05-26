import { cameraEntityFactory } from '../entities/camera';

export const reolinkFixtures = {
  camera: cameraEntityFactory({
    friendly_name: 'Reolink Driveway',
    entity_picture: '/api/camera_proxy/camera.reolink_driveway',
  }),
  hlsStreamUrl: 'http://homeassistant.local:8123/api/hls/camera.reolink_driveway/master.m3u8',
};
