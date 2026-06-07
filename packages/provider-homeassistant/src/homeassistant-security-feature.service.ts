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

function withOptionalCode(code?: string) {
  return typeof code === 'string' && code.trim().length > 0 ? { code: code.trim() } : {};
}

const ALARM_SERVICES: Record<
  keyof Pick<
    ProviderSecurityFeatureService,
    'armHome' | 'armAway' | 'armNight' | 'armVacation' | 'armCustomBypass' | 'disarm' | 'trigger'
  >,
  string
> = {
  armHome: 'alarm_arm_home',
  armAway: 'alarm_arm_away',
  armNight: 'alarm_arm_night',
  armVacation: 'alarm_arm_vacation',
  armCustomBypass: 'alarm_arm_custom_bypass',
  disarm: 'alarm_disarm',
  trigger: 'alarm_trigger',
};

export const homeAssistantSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (entityId) =>
    await callHomeAssistantService('lock', 'lock', {}, { entityId: entityId }),
  unlockEntity: async (entityId) =>
    await callHomeAssistantService('lock', 'unlock', {}, { entityId: entityId }),
  armHome: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.armHome,
      withOptionalCode(code),
      { entityId }
    ),
  armAway: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.armAway,
      withOptionalCode(code),
      { entityId }
    ),
  armNight: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.armNight,
      withOptionalCode(code),
      { entityId }
    ),
  armVacation: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.armVacation,
      withOptionalCode(code),
      { entityId }
    ),
  armCustomBypass: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.armCustomBypass,
      withOptionalCode(code),
      { entityId }
    ),
  disarm: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.disarm,
      withOptionalCode(code),
      { entityId }
    ),
  trigger: async (entityId, code) =>
    await callHomeAssistantService(
      'alarm_control_panel',
      ALARM_SERVICES.trigger,
      withOptionalCode(code),
      { entityId }
    ),
  openCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('open', mode),
      {},
      {
        entityId: entityId,
      }
    ),
  closeCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('close', mode),
      {},
      {
        entityId: entityId,
      }
    ),
  stopCover: async (entityId, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('stop', mode),
      {},
      {
        entityId: entityId,
      }
    ),
  setCoverPosition: async (entityId, position, mode = 'position') =>
    await callHomeAssistantService(
      'cover',
      resolveCoverService('set_position', mode),
      mode === 'tilt' ? { tilt_position: position } : { position },
      { entityId: entityId }
    ),
};
