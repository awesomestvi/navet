import { dispatchEntityCommand } from '@navet/app/commands';
import type { LightDashboardItem } from './light-dashboard-model';

export interface LightBatchActionResult {
  succeeded: number;
  failed: number;
  skippedUnavailable: number;
}

export async function setLightsPower(
  lights: LightDashboardItem[],
  state: 'on' | 'off'
): Promise<LightBatchActionResult> {
  const targets = lights.filter((light) => light.available && light.supportsToggle);
  const results = await Promise.allSettled(
    targets.map(async (light) => {
      const result = await dispatchEntityCommand(
        { type: state === 'on' ? 'turn_on' : 'turn_off', entityId: light.id },
        light.providerId
      );
      if (!result.accepted) throw new Error(result.error ?? 'Command was rejected');
    })
  );

  return {
    succeeded: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
    skippedUnavailable: lights.filter((light) => !light.available).length,
  };
}

export async function setLightsBrightness(
  lights: LightDashboardItem[],
  brightness: number
): Promise<LightBatchActionResult> {
  const targets = lights.filter((light) => light.available && light.supportsBrightness);
  const normalizedBrightness = Math.min(100, Math.max(1, Math.round(brightness)));
  const results = await Promise.allSettled(
    targets.map(async (light) => {
      const result = await dispatchEntityCommand(
        { type: 'set_brightness', entityId: light.id, brightness: normalizedBrightness },
        light.providerId
      );
      if (!result.accepted) throw new Error(result.error ?? 'Command was rejected');
    })
  );

  return {
    succeeded: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
    skippedUnavailable: lights.filter((light) => !light.available).length,
  };
}
