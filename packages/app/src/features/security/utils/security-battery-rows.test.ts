import type { DeviceWithType, SensorDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { getSecurityAlertCount } from './security-alert-count';
import { buildSecurityBatteryRows, collapseSecurityBatteryDevices } from './security-battery-rows';

function battery(id: string, overrides: Partial<SensorDevice> = {}): DeviceWithType {
  return {
    type: 'sensors',
    id,
    name: id,
    room: 'Home',
    size: 'small',
    securityKind: 'battery',
    value: '80',
    unit: '%',
    status: 'measurement',
    providerId: 'homey',
    ...overrides,
  };
}

describe('Security battery rows', () => {
  it('shows the source device name without repeating the battery measurement label', () => {
    const device = battery('homey:window#measure_battery', {
      name: 'Bedroom window · Battery',
      sourceDeviceName: 'Bedroom window',
    });
    expect(buildSecurityBatteryRows([device])[0]).toMatchObject({
      name: 'Bedroom window',
      level: 80,
    });
    expect(device.name).toBe('Bedroom window · Battery');
  });
  it('counts a combined low battery once while retaining the provider warning when charge alone is higher', () => {
    const devices = [
      battery('flag', {
        sourceDeviceId: 'smoke',
        value: 'Detected',
        unit: '',
        status: 'active',
        securitySeverity: 'warning',
      }),
      battery('charge', { sourceDeviceId: 'smoke', value: '35', securitySeverity: 'normal' }),
    ];
    expect(collapseSecurityBatteryDevices(devices)).toMatchObject([
      { id: 'charge', value: '35', securitySeverity: 'warning' },
    ]);
    expect(getSecurityAlertCount(devices)).toBe(1);
    expect(getSecurityAlertCount(devices.slice(0, 1))).toBe(1);
  });
  it('combines charge and low-battery status from one device, preserving its actual percentage and warning', () => {
    const rows = buildSecurityBatteryRows([
      battery('flag', { sourceDeviceId: 'smoke', value: 'Detected', unit: '', status: 'active' }),
      battery('charge', { sourceDeviceId: 'smoke', value: '35' }),
    ]);
    expect(rows).toEqual([
      { id: 'charge', name: 'charge', level: 35, status: 'low', entityIds: ['flag', 'charge'] },
    ]);
  });

  it('keeps provider identities separate and sorts low charge first', () => {
    const rows = buildSecurityBatteryRows([
      battery('homey', { sourceDeviceId: 'sensor', value: '90' }),
      battery('openhab', { providerId: 'openhab', sourceDeviceId: 'sensor', value: '15' }),
    ]);
    expect(rows.map(({ id, level }) => ({ id, level }))).toEqual([
      { id: 'openhab', level: 15 },
      { id: 'homey', level: 90 },
    ]);
  });

  it('represents flag-only and unknown batteries without inventing percentages, preserving genuine zero charge', () => {
    const rows = buildSecurityBatteryRows([
      battery('okay', { value: 'Clear', unit: '', status: 'clear' }),
      battery('missing', { value: '', status: 'unavailable' }),
      battery('empty', { value: '0' }),
    ]);
    expect(rows.map(({ id, level, status }) => ({ id, level, status }))).toEqual([
      { id: 'empty', level: 0, status: 'low' },
      { id: 'okay', level: null, status: 'okay' },
      { id: 'missing', level: null, status: 'unavailable' },
    ]);
  });
});
