import type { ProviderSecurityFeatureService } from '@navet/core/provider-feature-services';
import { callHomeyService } from './homey-bridge';

const unsupportedAlarm = async () => {
  throw new Error('Homey alarm-panel actions are not supported');
};

async function coverAction(
  entityId: string,
  service: string,
  mode: 'position' | 'tilt' = 'position',
  serviceData: Record<string, unknown> = {}
) {
  if (mode === 'tilt') throw new Error('Homey cover tilt controls are not supported');
  await callHomeyService('cover', service, serviceData, { entityId });
}

export const homeySecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (entityId) => callHomeyService('lock', 'lock', {}, { entityId }),
  unlockEntity: async (entityId) => callHomeyService('lock', 'unlock', {}, { entityId }),
  armHome: unsupportedAlarm,
  armAway: unsupportedAlarm,
  armNight: unsupportedAlarm,
  armVacation: unsupportedAlarm,
  armCustomBypass: unsupportedAlarm,
  disarm: unsupportedAlarm,
  trigger: unsupportedAlarm,
  openCover: async (entityId, mode) => coverAction(entityId, 'open_cover', mode),
  closeCover: async (entityId, mode) => coverAction(entityId, 'close_cover', mode),
  stopCover: async (entityId, mode) => coverAction(entityId, 'stop_cover', mode),
  setCoverPosition: async (entityId, position, mode) =>
    coverAction(entityId, 'set_cover_position', mode, { position }),
};
