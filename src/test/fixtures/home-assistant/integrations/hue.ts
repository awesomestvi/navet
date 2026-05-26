import { lightEntityFactory } from '../entities/light';
import { sceneEntityFactory } from '../entities/scene';

export const hueFixtures = {
  groupedLight: lightEntityFactory({
    friendly_name: 'Living Room Lights',
    supported_color_modes: ['xy', 'color_temp'],
    is_hue_group: true,
  }),
  scene: sceneEntityFactory({
    friendly_name: 'Savanna Sunset',
  }),
  activateSceneService: {
    domain: 'hue',
    service: 'activate_scene',
    service_data: {
      entity_id: 'scene.savanna_sunset',
      dynamic: true,
      brightness: 180,
    },
  },
};
