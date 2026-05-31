import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityCommandMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
}));

const { updateLightMock } = vi.hoisted(() => ({
  updateLightMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: (providerId: string) => ({
    lightFeatureService:
      providerId === 'home_assistant'
        ? {
            updateLight: updateLightMock,
          }
        : undefined,
  }),
}));

describe('integration-light-feature.service', () => {
  beforeEach(() => {
    dispatchEntityCommandMock.mockClear();
    updateLightMock.mockClear();
  });

  it('routes basic light updates through provider-neutral commands', async () => {
    const { integrationLightFeatureService } = await import('../integration-light-feature.service');

    await integrationLightFeatureService.applyBasicLightUpdate('homey:light.office', {
      state: 'on',
      brightnessPct: 45,
      kelvin: 3200,
    });

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      type: 'set_brightness',
      entityId: 'homey:light.office',
      brightness: 45,
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      type: 'set_color_temperature',
      entityId: 'homey:light.office',
      kelvin: 3200,
    });
  });

  it('routes advanced light updates through the provider feature service', async () => {
    const { integrationLightFeatureService } = await import('../integration-light-feature.service');

    await integrationLightFeatureService.updateLight('home_assistant:light.wled', {
      state: 'on',
      effect: 'Rainbow',
    });

    expect(updateLightMock).toHaveBeenCalledWith('light.wled', {
      state: 'on',
      effect: 'Rainbow',
    });
  });
});
