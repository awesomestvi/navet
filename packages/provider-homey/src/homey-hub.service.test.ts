import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from './homey-service';
import {
  getHomeyHistory,
  homeyHistoryFeatureService,
  homeyHubFeatureService,
  loadHomeyResources,
  mapHomeyHubSnapshot,
  runHomeyResource,
} from './homey-hub.service';
import { mapHomeySnapshotToNavetEntities } from './homey-mappers';
import { homeyNotificationFeatureService } from './homey-notification-feature.service';
import type { HomeySnapshot } from './homey-types';

const fixture: HomeySnapshot = {
  connected: true,
  zones: { kitchen: { id: 'kitchen', name: 'Kitchen' } },
  devices: {
    lamp: {
      id: 'lamp',
      name: 'Lamp',
      class: 'light',
      zone: 'kitchen',
      capabilitiesObj: {
        onoff: { value: false, type: 'boolean', setable: true },
        dim: { value: 0.4, type: 'number', setable: true, min: 0, max: 1 },
        mode: {
          value: 'auto',
          type: 'enum',
          setable: true,
          values: [
            { id: 'auto', title: 'Auto' },
            { id: 'manual', title: 'Manual' },
          ],
        },
        measure_power: { value: 32, type: 'number', setable: false, units: 'W' },
      },
    },
  },
  flows: {
    arrival: { id: 'arrival', name: 'Arrival', enabled: true, triggerable: true },
    event: { id: 'event', name: 'Event only', triggerable: false },
    disabled: { id: 'disabled', name: 'Disabled', enabled: false, triggerable: true },
  },
  advancedFlows: { night: { id: 'night', name: 'Night', enabled: true, triggerable: true } },
  moods: { dinner: { id: 'dinner', name: 'Dinner', zone: 'kitchen' } },
  me: {
    id: 'me',
    name: 'Vishal',
    present: true,
    asleep: false,
    properties: { favoriteDevices: ['other'], favoriteFlows: ['arrival'], untouched: 1 },
  },
  users: { guest: { id: 'guest', name: 'Guest', present: false } },
  notifications: {
    notice: {
      id: 'notice',
      excerpt: 'Door open',
      ownerName: 'Security',
      dateCreated: '2026-09-14T08:00:00Z',
    },
  },
  apps: { app: { id: 'app', name: 'Lighting', version: '1.0', state: 'running' } },
  logs: {
    'homey:device:lamp:measure_power': {
      id: 'homey:device:lamp:measure_power',
      ownerUri: 'homey:device:lamp',
      title: 'Power',
      units: 'W',
    },
  },
};

describe('Homey resources', () => {
  const request = vi.fn();
  beforeEach(() => {
    request.mockReset();
    homeyService.setClient({ request, setCapabilityValue: vi.fn() });
    homeyService.resetSnapshot();
    homeyService.replaceSnapshot(structuredClone(fixture));
  });

  it('exposes every requested resource category and maps writable device capabilities', () => {
    const snapshot = mapHomeyHubSnapshot(fixture);
    expect(
      Object.entries(snapshot.sections)
        .filter(([key]) => key !== 'installations')
        .every(([, items]) => items.length > 0)
    ).toBe(true);
    expect(snapshot.sections.devices[0]).toMatchObject({
      id: 'homey:lamp',
      description: 'Kitchen',
      favorite: false,
    });
    expect(snapshot.sections.devices[0].controls).toContainEqual(
      expect.objectContaining({ id: 'measure_power', writable: false })
    );
    expect(
      snapshot.sections.people
        .find((item) => item.id === 'homey:person/guest')
        ?.controls?.every((cap) => !cap.writable)
    ).toBe(true);
    expect(
      snapshot.sections.automations.find((item) => item.id === 'homey:flow/event')?.runnable
    ).toBe(false);
  });

  it('keeps devices connected when optional Homey managers are denied or unavailable', async () => {
    const result = await loadHomeyResources(async <T>(path: string): Promise<T> => {
      if (path.includes('moods')) throw new Error('Homey request failed with status 404');
      if (path.includes('users')) throw new Error('Homey request failed with status 403');
      return {} as T;
    });
    const snapshot = { ...fixture, ...result };
    expect(snapshot.connected).toBe(true);
    expect(snapshot.devices.lamp.name).toBe('Lamp');
    expect(snapshot.moods).toEqual({});
    expect(snapshot.users).toEqual({});
    expect(mapHomeyHubSnapshot(snapshot).errors).toMatchObject({
      scenes: expect.stringContaining('404'),
      people: expect.stringContaining('403'),
    });
  });

  it('puts runnable flows, moods and people in shared collections without hiding light sensors', () => {
    const entities = mapHomeySnapshotToNavetEntities(fixture);
    expect(entities.filter((entity) => entity.type === 'scene').map((entity) => entity.id)).toEqual(
      ['homey:flow/arrival', 'homey:advancedflow/night', 'homey:mood/dinner']
    );
    expect(entities.find((entity) => entity.id === 'homey:person/me')).toMatchObject({
      type: 'person',
      primaryState: 'home',
    });
    expect(entities.find((entity) => entity.id === 'homey:lamp#measure_power')).toMatchObject({
      type: 'sensor',
      primaryState: 32,
    });
  });

  it('accepts Insights arrays returned by Homey Self-Hosted Server', async () => {
    const logs = Object.values(fixture.logs!);
    const result = await loadHomeyResources(
      async <T>(path: string): Promise<T> => (path.includes('insights') ? logs : {}) as T
    );
    expect(Object.values(result.logs!)).toEqual(logs);
    expect(result.resourceErrors?.logs).toBeUndefined();
  });

  it('starts standard and advanced flows and moods through their own API paths', async () => {
    await runHomeyResource('homey:flow/arrival');
    await runHomeyResource('homey:advancedflow/night');
    await runHomeyResource('homey:mood/dinner');
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/api/manager/flow/flow/arrival/trigger',
      '/api/manager/flow/advancedflow/night/trigger',
      '/api/manager/moods/mood/dinner/set',
    ]);
    await expect(runHomeyResource('homey:flow/event')).rejects.toThrow(
      'cannot be started manually'
    );
    await expect(runHomeyResource('homey:flow/disabled')).rejects.toThrow(
      'cannot be started manually'
    );
    await expect(runHomeyResource('openhab:flow/arrival')).rejects.toThrow('another provider');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('executes scene-card commands through the Homey resource action', async () => {
    const entity = mapHomeySnapshotToNavetEntities(fixture).find(
      (item) => item.id === 'homey:mood/dinner'
    )!;
    await homeyService.executeCommand(entity, { type: 'turn_on', entityId: entity.id });
    expect(request).toHaveBeenCalledWith('/api/manager/moods/mood/dinner/set', { method: 'POST' });
  });

  it('validates typed capabilities and changes only the requested value after success', async () => {
    await homeyHubFeatureService.setControl('homey:lamp', 'dim', 0.7);
    expect(request).toHaveBeenCalledWith(
      '/api/manager/devices/device/lamp/capability/dim',
      expect.objectContaining({ method: 'PUT', body: '{"value":0.7}' })
    );
    expect(homeyService.getSnapshot().devices.lamp.capabilitiesObj?.dim.value).toBe(0.7);
    await expect(homeyHubFeatureService.setControl('homey:lamp', 'dim', 2)).rejects.toThrow(
      'Invalid'
    );
    await expect(
      homeyHubFeatureService.setControl('homey:lamp', 'mode', 'invalid')
    ).rejects.toThrow('Invalid');
    await expect(
      homeyHubFeatureService.setControl('homey:lamp', 'measure_power', 1)
    ).rejects.toThrow('cannot be changed');
    request.mockRejectedValueOnce(new Error('Offline'));
    await expect(homeyHubFeatureService.setControl('homey:lamp', 'onoff', true)).rejects.toThrow(
      'Offline'
    );
    expect(homeyService.getSnapshot().devices.lamp.capabilitiesObj?.onoff.value).toBe(false);
  });

  it('presents fractional percentages in household units and translates writes back to Homey', async () => {
    const snapshot = structuredClone(fixture);
    snapshot.devices.lamp.capabilitiesObj!.dim.units = '%';
    snapshot.devices.lamp.capabilitiesObj!.dim.step = 0.01;
    homeyService.replaceSnapshot(snapshot);
    expect(mapHomeyHubSnapshot(snapshot).sections.devices[0].controls).toContainEqual(
      expect.objectContaining({ id: 'dim', value: 40, min: 0, max: 100, step: 1, unit: '%' })
    );
    await homeyHubFeatureService.setControl('homey:lamp', 'dim', 72);
    expect(request).toHaveBeenCalledWith(
      '/api/manager/devices/device/lamp/capability/dim',
      expect.objectContaining({ body: '{"value":0.72}' })
    );
    expect(homeyService.getSnapshot().devices.lamp.capabilitiesObj?.dim.value).toBe(0.72);
    await expect(homeyHubFeatureService.setControl('homey:lamp', 'dim', 101)).rejects.toThrow(
      'Invalid'
    );
  });

  it('changes your own presence while leaving other household members read-only', async () => {
    await homeyHubFeatureService.setControl('homey:person/me', 'present', false);
    expect(request).toHaveBeenCalledWith(
      '/api/manager/presence/me/present',
      expect.objectContaining({ body: '{"value":false}' })
    );
    expect(homeyService.getSnapshot().me?.present).toBe(false);
    await expect(
      homeyHubFeatureService.setControl('homey:person/guest', 'present', true)
    ).rejects.toThrow('Only your own');
  });

  it('preserves existing Homey favorites and unrelated profile properties', async () => {
    request.mockImplementation(async (path: string) =>
      path === '/api/manager/users/user/me'
        ? structuredClone(homeyService.getSnapshot().me)
        : undefined
    );
    await homeyHubFeatureService.setFavorite('homey:lamp', true);
    expect(request).toHaveBeenCalledWith(
      '/api/manager/users/user/me/properties/favoriteDevices',
      expect.objectContaining({ body: '{"value":["other","lamp"]}' })
    );
    await homeyHubFeatureService.setFavorite('homey:flow/arrival', false);
    expect(homeyService.getSnapshot().me?.properties).toEqual({
      favoriteDevices: ['other', 'lamp'],
      favoriteFlows: [],
      untouched: 1,
    });
  });

  it('normalizes Insights values, skips missing samples and routes entity history', async () => {
    const now = Date.now();
    const time = new Date(now - 1000).toISOString();
    request.mockResolvedValue({
      values: [
        { t: time, v: 32 },
        { t: time, v: null },
        { t: 'invalid', v: 3 },
      ],
    });
    expect(await getHomeyHistory('homey:insight/homey:device:lamp:measure_power', 'week')).toEqual([
      { time, value: 32 },
    ]);
    expect(request).toHaveBeenCalledWith(
      '/api/manager/insights/log/homey%3Adevice%3Alamp/homey%3Adevice%3Alamp%3Ameasure_power/entry?resolution=last7Days',
      undefined
    );
    expect(
      await homeyHistoryFeatureService.getEntityHistory!({
        entityId: 'lamp#measure_power',
        startTime: new Date(now - 10_000).toISOString(),
      })
    ).toMatchObject({ points: [{ state: '32', changedAt: time }] });
  });

  it('exposes Homey notifications in shared notification state with scoped IDs', async () => {
    expect(await homeyNotificationFeatureService.getSnapshot()).toMatchObject({
      persistentNotifications: [
        { notification_id: 'homey:notice', title: 'Security', message: 'Door open' },
      ],
    });
    const listener = vi.fn();
    const unsubscribe =
      await homeyNotificationFeatureService.subscribePersistentNotifications(listener);
    homeyService.replaceSnapshot({ notifications: {} });
    expect(listener).toHaveBeenCalledWith({ update_type: 'current', notifications: [] });
    unsubscribe();
    await homeyNotificationFeatureService.dismissPersistentNotification('notice');
    expect(request).not.toHaveBeenCalled();
  });
});
