import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import { describe, expect, it, vi } from 'vitest';
import { ProviderRuntimeQuery } from './provider-runtime-query';

describe('ProviderRuntimeQuery', () => {
  it('indexes registry and snapshot projections with stable references', () => {
    const snapshots = {
      'light.kitchen': { entityId: 'light.kitchen', state: 'on', attributes: {} },
      'sensor.kitchen': { entityId: 'sensor.kitchen', state: '21', attributes: {} },
    };
    const registry = [
      { entityId: 'sensor.kitchen', deviceId: 'device-1' },
      { entityId: 'light.kitchen', deviceId: 'device-1' },
    ];
    const runtime: ProviderEntityRuntimeService = {
      getEntitySnapshots: () => snapshots,
      subscribeEntitySnapshots: () => vi.fn(),
      getEntityRegistryEntries: () => registry,
      subscribeEntityRegistryEntries: () => vi.fn(),
      getConfig: () => null,
      subscribeConfig: () => vi.fn(),
    };
    const query = new ProviderRuntimeQuery(runtime);

    const lightSnapshots = query.selectSnapshotsByPrefixes(['light.']);
    expect(lightSnapshots).toEqual({ 'light.kitchen': snapshots['light.kitchen'] });
    expect(query.selectSnapshotsByPrefixes(['light.'])).toBe(lightSnapshots);

    const deviceEntries = query.selectRegistryByDeviceId('device-1');
    expect(deviceEntries.map((entry) => entry.entityId)).toEqual([
      'light.kitchen',
      'sensor.kitchen',
    ]);
    expect(query.selectRegistryByDeviceId('device-1')).toBe(deviceEntries);

    const record = query.selectSnapshotRecord(['sensor.kitchen', 'missing']);
    expect(record).toEqual({
      'sensor.kitchen': snapshots['sensor.kitchen'],
      missing: undefined,
    });
    expect(query.selectSnapshotRecord(['sensor.kitchen', 'missing'])).toBe(record);
  });
});
