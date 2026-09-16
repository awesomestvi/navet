import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  selectedProviderIds: ['openhab', 'home_assistant'],
  service: { getForecast: vi.fn() },
}));

vi.mock('@navet/app/stores/integration-store', () => ({
  integrationStore: {
    getState: () => ({
      currentProviderId: 'openhab',
      selectedProviderIds: fixture.selectedProviderIds,
    }),
  },
}));
vi.mock('@navet/app/provider-runtime-registry', () => ({
  hasProviderFeature: (provider: string) => provider === 'home_assistant',
  getProviderRuntimeRegistration: (provider: string) => ({
    weatherFeatureService: provider === 'home_assistant' ? fixture.service : null,
  }),
}));

import { resolveProviderFeatureService } from '../integration-provider-service';

describe('feature source routing', () => {
  const options = {
    feature: 'weather' as const,
    getService: (registration: { weatherFeatureService?: unknown }) =>
      registration.weatherFeatureService,
    unsupportedMessage: 'Unsupported weather source',
    missingMessage: 'Missing weather service',
  };

  beforeEach(() => {
    fixture.selectedProviderIds = ['openhab', 'home_assistant'];
  });

  it('finds an available feature without requiring a global provider choice', () => {
    expect(resolveProviderFeatureService(options)).toMatchObject({
      providerId: 'home_assistant',
      service: fixture.service,
    });
  });

  it('routes a selected entity to its owner even when another session is current', () => {
    expect(
      resolveProviderFeatureService({ ...options, entityId: 'home_assistant:weather.home' })
    ).toMatchObject({ providerId: 'home_assistant', nativeEntityId: 'weather.home' });
  });

  it('does not substitute a different provider for an unsupported selected source', () => {
    expect(() =>
      resolveProviderFeatureService({ ...options, entityId: 'openhab:weather.home' })
    ).toThrow('Unsupported weather source');
  });

  it('does not select a provider outside the connected collection', () => {
    fixture.selectedProviderIds = ['openhab'];
    expect(() => resolveProviderFeatureService(options)).toThrow('Unsupported weather source');
  });
});
