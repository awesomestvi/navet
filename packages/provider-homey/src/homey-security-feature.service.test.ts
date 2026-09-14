import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from './homey-service';
import { homeySecurityFeatureService } from './homey-security-feature.service';

vi.mock('./homey-bridge', () => ({
  callHomeyService: (...args: Parameters<typeof homeyService.callService>) =>
    homeyService.callService(...args),
}));

describe('Homey cover feature service', () => {
  const setCapabilityValue = vi.fn(async () => undefined);
  beforeEach(() => {
    setCapabilityValue.mockClear();
    homeyService.resetSnapshot();
    homeyService.setClient({ setCapabilityValue });
    homeyService.replaceSnapshot({
      connected: true,
      zones: {},
      devices: {
        blind: {
          id: 'blind',
          name: 'Bedroom blind',
          class: 'blinds',
          capabilitiesObj: { windowcoverings_set: { value: 0.35, setable: true } },
        },
      },
    });
  });

  it('routes the shared cover slider through the feature service to Homey', async () => {
    await homeySecurityFeatureService.setCoverPosition('blind', 75, 'position');
    await homeySecurityFeatureService.closeCover('blind');
    await homeySecurityFeatureService.openCover('blind');
    expect(setCapabilityValue.mock.calls).toEqual([
      [{ deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 0.75 }],
      [{ deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 0 }],
      [{ deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 1 }],
    ]);
  });

  it('rejects unsupported tilt, stop, and alarm-panel actions without sending writes', async () => {
    await expect(homeySecurityFeatureService.setCoverPosition('blind', 75, 'tilt')).rejects.toThrow(
      'tilt'
    );
    await expect(homeySecurityFeatureService.stopCover('blind')).rejects.toThrow(
      'does not support'
    );
    await expect(homeySecurityFeatureService.armAway('blind')).rejects.toThrow('alarm-panel');
    expect(setCapabilityValue).not.toHaveBeenCalled();
  });
});
