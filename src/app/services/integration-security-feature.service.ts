import type { ProviderSecurityFeatureService } from '@/app/platform/provider-feature-services';
import { dispatchEntityAction } from '@/app/services/integration-action.service';

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

export const integrationSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: (entityId) =>
    dispatchEntityAction({
      entityId,
      domain: 'lock',
      service: 'lock',
    }),
  unlockEntity: (entityId) =>
    dispatchEntityAction({
      entityId,
      domain: 'lock',
      service: 'unlock',
    }),
  openCover: (entityId, mode = 'position') =>
    dispatchEntityAction({
      entityId,
      domain: 'cover',
      service: resolveCoverService('open', mode),
    }),
  closeCover: (entityId, mode = 'position') =>
    dispatchEntityAction({
      entityId,
      domain: 'cover',
      service: resolveCoverService('close', mode),
    }),
  stopCover: (entityId, mode = 'position') =>
    dispatchEntityAction({
      entityId,
      domain: 'cover',
      service: resolveCoverService('stop', mode),
    }),
  setCoverPosition: (entityId, position, mode = 'position') =>
    dispatchEntityAction({
      entityId,
      domain: 'cover',
      service: resolveCoverService('set_position', mode),
      serviceData: mode === 'tilt' ? { tilt_position: position } : { position },
    }),
};
