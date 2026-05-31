import type { ProviderSecurityFeatureService } from '@navet/core/provider-feature-services';
import { callHomeAssistantService } from './homeassistant-service-bridge';

function resolveCoverService(
  base: 'open' | 'close' | 'stop' | 'set_position',
  mode: 'position' | 'tilt'
) {
  if (base === 'set_position') {
    return mode === 'tilt' ? 'set_cover_tilt_position' : 'set_cover_position';
  }

  if (base === 'open') {
    return mode === 'tilt' ? 'open_cover_tilt' : 'open_cover';
  }

  if (base === 'close') {
    return mode === 'tilt' ? 'close_cover_tilt' : 'close_cover';
  }

  return mode === 'tilt' ? 'stop_cover_tilt' : 'stop_cover';
}

export const homeAssistantSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (entityId) =>
    await callHomeAssistantService('lock', 'lock', {}, { entity_id: entityId }),
  unlockEntity: async (entityId) =>
    await callHomeAssistantService('lock', 'unlock', {}, { entity_id: entityId }),
  openCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('open', mode),
      {},
      {
        entity_id: entityId,
      }
    ),
  closeCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('close', mode),
      {},
      {
        entity_id: entityId,
      }
    ),
  stopCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('stop', mode),
      {},
      {
        entity_id: entityId,
      }
    ),
  setCoverPosition: async (entityId, position, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('set_position', mode),
      mode === 'tilt' ? { tilt_position: position } : { position },
      { entity_id: entityId }
    ),
};
