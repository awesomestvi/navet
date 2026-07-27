import { Gauge, Lightbulb, Speaker, Thermometer, Tv, Zap } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { getDeviceTypeIcon } from './device-type-icons';

describe('getDeviceTypeIcon', () => {
  it('resolves normalized Navet entity types', () => {
    expect(getDeviceTypeIcon('light')).toBe(Lightbulb);
    expect(getDeviceTypeIcon('climate')).toBe(Thermometer);
    expect(getDeviceTypeIcon('sensor')).toBe(Gauge);
    expect(getDeviceTypeIcon('energy')).toBe(Zap);
  });

  it('uses device classes to refine media and sensor icons', () => {
    expect(getDeviceTypeIcon('media_player', 'speaker')).toBe(Speaker);
    expect(getDeviceTypeIcon('media_player', 'tv')).toBe(Tv);
    expect(getDeviceTypeIcon('binary_sensor', 'temperature')).toBe(Thermometer);
  });
});
