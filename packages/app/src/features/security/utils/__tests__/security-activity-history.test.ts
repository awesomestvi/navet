import type { LockDevice, SensorDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  buildCurrentSecurityActivityEvents,
  buildSecurityActivityEvents,
} from '../security-activity-history';

const now = Date.parse('2026-08-23T12:00:00.000Z');

function typedLock(state: boolean): LockDevice & { type: 'locks' } {
  return {
    id: 'lock.front_door',
    name: 'Front Door',
    room: 'Entrance',
    size: 'small',
    state,
    securityKind: 'lock',
    securitySeverity: state ? 'normal' : 'warning',
    type: 'locks',
  };
}

function typedSensor(
  id: string,
  securityKind: 'door' | 'motion' | 'smoke',
  value: string
): SensorDevice & { type: 'sensors' } {
  return {
    id,
    name: id,
    room: 'Entrance',
    size: 'small',
    value,
    unit: '',
    status: value === 'off' ? 'clear' : 'active',
    securityKind,
    securitySeverity: securityKind === 'smoke' && value === 'on' ? 'critical' : 'active',
    type: 'sensors',
  };
}

describe('security activity history', () => {
  it('turns lock, opening, motion, and hazard transitions into recent events', () => {
    const devices = [
      typedLock(false),
      typedSensor('binary_sensor.patio', 'door', 'on'),
      typedSensor('binary_sensor.motion', 'motion', 'on'),
      typedSensor('binary_sensor.smoke', 'smoke', 'off'),
    ];
    const events = buildSecurityActivityEvents({
      devices,
      nowMs: now,
      histories: [
        {
          entityId: 'lock.front_door',
          points: [
            { state: 'locked', changedAt: '2026-08-23T10:00:00.000Z' },
            { state: 'unlocked', changedAt: '2026-08-23T10:10:00.000Z' },
          ],
        },
        {
          entityId: 'binary_sensor.patio',
          points: [
            { state: 'off', changedAt: '2026-08-23T10:00:00.000Z' },
            { state: 'on', changedAt: '2026-08-23T10:20:00.000Z' },
          ],
        },
        {
          entityId: 'binary_sensor.motion',
          points: [
            { state: 'off', changedAt: '2026-08-23T10:00:00.000Z' },
            { state: 'on', changedAt: '2026-08-23T10:30:00.000Z' },
          ],
        },
        {
          entityId: 'binary_sensor.smoke',
          points: [
            { state: 'on', changedAt: '2026-08-23T10:00:00.000Z' },
            { state: 'off', changedAt: '2026-08-23T10:40:00.000Z' },
          ],
        },
      ],
    });

    expect(events.map((event) => event.kind)).toEqual([
      'hazard-cleared',
      'motion',
      'opened',
      'unlocked',
    ]);
  });

  it('ignores the baseline, stale changes, and unavailable states', () => {
    const events = buildSecurityActivityEvents({
      devices: [typedSensor('binary_sensor.patio', 'door', 'off')],
      nowMs: now,
      histories: [
        {
          entityId: 'binary_sensor.patio',
          points: [
            { state: 'on', changedAt: '2026-08-22T09:00:00.000Z' },
            { state: 'unavailable', changedAt: '2026-08-23T10:00:00.000Z' },
            { state: 'off', changedAt: '2026-08-22T11:00:00.000Z' },
          ],
        },
      ],
    });

    expect(events).toEqual([]);
  });

  it('provides current-state fallback events when history is unavailable', () => {
    expect(
      buildCurrentSecurityActivityEvents([
        typedLock(false),
        typedSensor('binary_sensor.smoke', 'smoke', 'on'),
      ]).map((event) => event.kind)
    ).toEqual(['unlocked', 'hazard']);
  });
});
