import { describe, expect, it } from 'vitest';
import { getSensorQualityModel } from '../sensor-quality-model';

describe('getSensorQualityModel', () => {
  it('maps humidity to the complete percentage range with a comfortable middle band', () => {
    expect(getSensorQualityModel('humidity', '46', '%')).toMatchObject({
      percentage: 46,
      labels: ['<30%', '30–60%', '>60%'],
    });
  });

  it('normalizes carbon dioxide without hiding readings above the attention threshold', () => {
    expect(getSensorQualityModel('carbon_dioxide', '1420', 'ppm', 'critical')).toMatchObject({
      percentage: 71,
      accentColor: '#ef4444',
      labels: ['≤800 ppm', '1,200 ppm', '>1,200 ppm'],
    });
  });

  it('does not infer an air-quality warning color without normalized provider severity', () => {
    expect(getSensorQualityModel('carbon_dioxide', '1420', 'ppm')).toMatchObject({
      accentColor: '#14b8a6',
    });
  });

  it('does not invent a quality score for nonnumeric or unrelated sensors', () => {
    expect(getSensorQualityModel('carbon_dioxide', 'Excellent', '')).toBeNull();
    expect(getSensorQualityModel('pressure', '1012', 'hPa')).toBeNull();
  });
});
