import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { NavetEntity } from '@navet/core/types';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSecurityAlarmEntities } from './use-security-alarm-entities';

function createEntity(overrides: Partial<NavetEntity>): NavetEntity {
  return {
    id: 'home_assistant:alarm_control_panel.home',
    canonicalId: 'home_assistant:alarm_control_panel.home',
    providerId: 'home_assistant',
    externalId: 'alarm_control_panel.home',
    type: 'sensor',
    name: 'Home Alarm',
    room: 'Home',
    primaryState: 'armed_home',
    availability: 'available',
    capabilities: [],
    attributes: {
      alarmState: 'armed_home',
      alarmSupportedActions: ['disarm'],
    },
    ...overrides,
  };
}

describe('useSecurityAlarmEntities', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('does not rerender when an unrelated normalized entity changes', () => {
    const alarm = createEntity({});
    const camera = createEntity({
      id: 'home_assistant:camera.driveway',
      canonicalId: 'home_assistant:camera.driveway',
      externalId: 'camera.driveway',
      type: 'camera',
      name: 'Driveway Camera',
      primaryState: 'idle',
      attributes: {},
    });
    integrationStore.setState({
      providerEntitiesByCanonicalId: {
        [alarm.canonicalId]: alarm,
        [camera.canonicalId]: camera,
      },
    });

    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useSecurityAlarmEntities();
    });
    const initialAlarms = result.current;

    act(() => {
      integrationStore.setState((state) => ({
        providerEntitiesByCanonicalId: {
          ...state.providerEntitiesByCanonicalId,
          [camera.canonicalId]: {
            ...camera,
            primaryState: 'streaming',
          },
        },
      }));
    });

    expect(result.current).toBe(initialAlarms);
    expect(result.current).toEqual([
      expect.objectContaining({ id: alarm.canonicalId, state: 'armed_home' }),
    ]);
    expect(renderCount).toBe(1);
  });
});
