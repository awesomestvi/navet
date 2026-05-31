import { ProviderAuthRequiredError } from '@navet/core/errors';
import { createSmartThingsContractAdapter } from '@navet/provider-smartthings/smartthings-adapter';
import { beforeEach, describe, expect, it } from 'vitest';
import { createHubitatContractAdapter, createHubitatProviderContract } from './hubitat-adapter';

describe('planned provider contract', () => {
  beforeEach(() => {
    currentSession = null;
  });

  let currentSession: {
    providerId: 'hubitat';
    runtime: string;
    authMode: string;
    haBaseUrl: string;
    hassUrl: string;
  } | null = null;

  it('requires authentication before connecting the compatibility adapter', async () => {
    const adapter = createHubitatContractAdapter(undefined, {
      getSession: () => currentSession,
    });

    await expect(adapter.connect()).rejects.toBeInstanceOf(ProviderAuthRequiredError);
  });

  it('allows connect and disconnect when a provider session exists', async () => {
    const adapter = createHubitatContractAdapter(undefined, {
      getSession: () => currentSession,
    });
    currentSession = {
      providerId: 'hubitat',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://hubitat.local',
      hassUrl: 'http://hubitat.local',
    };

    await expect(adapter.connect()).resolves.toBeUndefined();
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });

  it('exposes an empty provider snapshot until the provider is implemented', async () => {
    const adapter = createHubitatContractAdapter(undefined, {
      getSession: () => currentSession,
    });

    await expect(adapter.listEntities()).resolves.toEqual([]);
    await expect(adapter.getEntity('hubitat:light.kitchen')).resolves.toBeNull();
    await expect(adapter.subscribeToEvents(() => undefined)).resolves.toEqual(expect.any(Function));
  });

  it('omits the deprecated legacy action bridge for planned providers', () => {
    const hubitatContract = createHubitatProviderContract();
    expect('dispatchAction' in hubitatContract).toBe(false);
  });

  it('keeps SmartThings on the same planned compatibility adapter behavior', async () => {
    const adapter = createSmartThingsContractAdapter(undefined, {
      getSession: () => null,
    });

    await expect(adapter.listEntities()).resolves.toEqual([]);
    await expect(adapter.getEntity('smartthings:light.kitchen')).resolves.toBeNull();
  });
});
