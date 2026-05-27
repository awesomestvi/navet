import { describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import type { HomeyAuthSession } from '@/auth/types';
import { homeyService } from '../homey.service';
import {
  bootstrapIntegrationSession,
  teardownIntegrationSession,
} from '../integration-bootstrap.service';

describe('integration-bootstrap.service', () => {
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
    expect(homeAssistantStore.getState().user).toEqual(session.user);
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
    expect(homeAssistantStore.getState().user).toBeNull();
  });
});
