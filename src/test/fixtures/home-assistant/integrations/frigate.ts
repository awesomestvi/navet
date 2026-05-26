import { cameraEntityFactory } from '../entities/camera';
import { imageEntityFactory } from '../entities/image';

export const frigateFixtures = {
  camera: cameraEntityFactory({
    friendly_name: 'Frigate Front Porch',
    entity_picture: '/api/camera_proxy/camera.frigate_front_porch',
  }),
  eventImage: imageEntityFactory({
    friendly_name: 'Frigate Person Snapshot',
    entity_picture: '/api/image/serve/frigate-event/512x512',
  }),
};
