import { describe, expect, it } from 'vitest';
import { compactRepeatedDeviceLabel, compactRepeatedLabelGroup } from '../compact-device-label';

describe('compactRepeatedDeviceLabel', () => {
  it('removes a shared device prefix from the primary label', () => {
    expect(
      compactRepeatedDeviceLabel('Pax Calima Boost mode', 'Pax Calima Boost mode', [
        'Pax Calima Power-on behaviour',
      ])
    ).toBe('Boost mode');
  });

  it('removes a shared device prefix from sibling labels', () => {
    expect(
      compactRepeatedDeviceLabel('Pax Calima Power-on behaviour', 'Pax Calima Boost mode', [
        'Pax Calima Power-on behaviour',
      ])
    ).toBe('Power-on behaviour');
  });

  it('splits compact camel-case labels after trimming the shared prefix', () => {
    expect(
      compactRepeatedDeviceLabel('Pax Calima BoostMode', 'Pax Calima Power-on behaviour', [
        'Pax Calima BoostMode',
      ])
    ).toBe('Boost Mode');
  });

  it('keeps the original label when trimming would empty it', () => {
    expect(compactRepeatedDeviceLabel('Pax Calima', 'Pax Calima', ['Pax Calima Boost mode'])).toBe(
      'Pax Calima'
    );
  });

  it('keeps unrelated labels unchanged', () => {
    expect(compactRepeatedDeviceLabel('Coffee Maker', 'Kitchen Switch', ['Coffee Maker'])).toBe(
      'Coffee Maker'
    );
  });

  it('removes a shared prefix inferred from a related label group', () => {
    expect(
      compactRepeatedLabelGroup('Pax Calima Humidity', [
        'Pax Calima Humidity',
        'Pax Calima Temperature',
        'Pax Calima Light',
      ])
    ).toBe('Humidity');
  });
});
