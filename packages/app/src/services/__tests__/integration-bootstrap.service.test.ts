import type { HomeyAuthSession, OpenHABAuthSession } from '@navet/app/auth/types';
import { integrationStore } from '@navet/app/stores/integration-store';
import { resetAppStores } from '@navet/app/test/store-reset';
import { openhabService } from '@navet/provider-openhab/openhab-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from '../homey.service';
import {
  bootstrapIntegrationSession,
  teardownIntegrationSession,
} from '../integration-bootstrap.service';

describe('integration-bootstrap.service', () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await resetAppStores();
  });

  it('hydrates Homey snapshots from a Homey session', async () => {
    const homeySnapshot = {
      connected: true,
      devices: {
        light_1: {
          id: 'light_1',
          name: 'Lamp',
          class: 'light',
          capabilitiesObj: { onoff: { value: true } },
        },
      },
      zones: {
        zone_1: { id: 'zone_1', name: 'Living Room' },
      },
    };
    const session: HomeyAuthSession = {
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      user: {
        id: 'user-1',
        name: 'Vishal',
        avatarUrl: 'https://images.example.com/vishal.png',
      },
      homeySnapshot,
    };

    await bootstrapIntegrationSession(session);

    expect(homeyService.getSnapshot()).toMatchObject(homeySnapshot);
    expect(integrationStore.getState().currentUser).toEqual(session.user);
  });

  it('falls back to the Homey client snapshot loader when the session has no embedded snapshot', async () => {
    homeyService.setClient({
      setCapabilityValue: vi.fn(),
      loadSnapshot: vi.fn().mockResolvedValue({
        connected: true,
        devices: {
          light_1: {
            id: 'light_1',
            name: 'Lamp',
          },
        },
        zones: {},
      }),
    });

    await bootstrapIntegrationSession({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
    });

    expect(homeyService.getSnapshot()).toMatchObject({
      connected: true,
      devices: {
        light_1: {
          name: 'Lamp',
        },
      },
    });
  });

  it('tears down the Homey snapshot when the provider disconnects', () => {
    homeyService.replaceSnapshot({
      connected: true,
      devices: {
        switch_1: { id: 'switch_1', name: 'Coffee Machine' },
      },
    });

    teardownIntegrationSession('homey');

    expect(homeyService.getSnapshot()).toEqual({
      connected: false,
      devices: {},
      zones: {},
    });
    expect(integrationStore.getState().currentUser).toBeNull();
  });

  it('hydrates openHAB snapshots from an openHAB session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              name: 'LivingRoom',
              type: 'Group',
              label: 'Living Room',
              tags: ['Location', 'LivingRoom'],
              groupNames: [],
            },
            {
              name: 'LivingRoomLamp',
              type: 'Switch',
              label: 'Living Room Lamp',
              state: 'ON',
              category: 'light',
              tags: ['Light'],
              groupNames: ['LivingRoom'],
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );

    const session: OpenHABAuthSession = {
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://openhab.local:8080',
      hassUrl: 'http://openhab.local:8080',
      username: 'navet',
      password: 'secret',
      user: {
        id: 'user-1',
        name: 'Vishal',
        avatarUrl: 'https://images.example.com/vishal.png',
      },
    };

    await bootstrapIntegrationSession(session);

    expect(openhabService.getSnapshot()).toMatchObject({
      connected: true,
      error: null,
      items: {
        LivingRoomLamp: expect.objectContaining({
          name: 'LivingRoomLamp',
          state: 'ON',
        }),
      },
    });
    expect(integrationStore.getState().providerHealth.openhab).toMatchObject({
      connected: true,
      lastError: null,
    });
    expect(integrationStore.getState().currentUser).toEqual(session.user);
  });

  it('records openHAB bootstrap failures in provider health', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not found', {
          status: 404,
        })
      )
    );

    await expect(
      bootstrapIntegrationSession({
        providerId: 'openhab',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'http://openhab.local:8080',
        hassUrl: 'http://openhab.local:8080',
        username: 'navet',
        password: 'secret',
      })
    ).rejects.toThrow('openHAB snapshot request failed with status 404');

    expect(openhabService.getSnapshot()).toMatchObject({
      connected: false,
      error: 'openHAB snapshot request failed with status 404',
    });
    expect(integrationStore.getState().providerHealth.openhab).toMatchObject({
      connected: false,
      lastError: 'openHAB snapshot request failed with status 404',
    });
  });
});
