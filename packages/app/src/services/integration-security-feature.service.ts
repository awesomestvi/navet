import { dispatchEntityCommand } from '@navet/app/commands';
import type { ProviderSecurityFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function getSecurityFeatureService(entityId: string) {
  const providerId = resolveIntegrationProviderId(entityId);
  const service = getProviderRuntimeRegistration(providerId).securityFeatureService;
  if (!service) {
    throw new Error('Security actions are not implemented yet for the current integration');
  }
  return service;
}

export const integrationSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (entityId) => {
    await dispatchEntityCommand({ type: 'lock', entityId });
  },
  unlockEntity: async (entityId) => {
    await dispatchEntityCommand({ type: 'unlock', entityId });
  },
  armHome: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'arm_home', entityId, code });
  },
  armAway: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'arm_away', entityId, code });
  },
  armNight: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'arm_night', entityId, code });
  },
  armVacation: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'arm_vacation', entityId, code });
  },
  armCustomBypass: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'arm_custom_bypass', entityId, code });
  },
  disarm: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'disarm', entityId, code });
  },
  trigger: async (entityId, code) => {
    await dispatchEntityCommand({ type: 'trigger', entityId, code });
  },
  openCover: async (entityId, mode = 'position') => {
    if (mode === 'position') {
      await dispatchEntityCommand({ type: 'open', entityId });
      return;
    }

    await getSecurityFeatureService(entityId).openCover(
      getNativeIntegrationEntityId(entityId),
      mode
    );
  },
  closeCover: async (entityId, mode = 'position') => {
    if (mode === 'position') {
      await dispatchEntityCommand({ type: 'close', entityId });
      return;
    }

    await getSecurityFeatureService(entityId).closeCover(
      getNativeIntegrationEntityId(entityId),
      mode
    );
  },
  stopCover: async (entityId, mode = 'position') => {
    if (mode === 'position') {
      await dispatchEntityCommand({ type: 'stop', entityId });
      return;
    }

    await getSecurityFeatureService(entityId).stopCover(
      getNativeIntegrationEntityId(entityId),
      mode
    );
  },
  setCoverPosition: async (entityId, position, mode = 'position') => {
    await getSecurityFeatureService(entityId).setCoverPosition(
      getNativeIntegrationEntityId(entityId),
      position,
      mode
    );
  },
};
