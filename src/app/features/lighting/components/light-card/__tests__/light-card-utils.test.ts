import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import {
  clampKelvin,
  clampPercentage,
  getBrightnessPercent,
  getReportedColorTempKelvin,
  hexToRgb,
  kelvinToColor,
  rgbToHs,
  rgbToXy,
  roundKelvin,
} from '../light-card-utils';

// Minimal HassEntity factory for tests
function makeEntity(overrides: Partial<HassEntity> = {}): HassEntity {
  return {
    entity_id: 'light.test',
    state: 'on',
    attributes: {},
    context: { id: '', parent_id: null, user_id: null },
    last_changed: '',
    last_updated: '',
    ...overrides,
  } as HassEntity;
}

// ─── clampPercentage ───────────────────────────────────────────────────────

describe('clampPercentage', () => {
  it('clamps above 100 to 100', () => expect(clampPercentage(120)).toBe(100));
  it('clamps below 0 to 0', () => expect(clampPercentage(-5)).toBe(0));
  it('rounds to the nearest integer', () => expect(clampPercentage(42.7)).toBe(43));
  it('respects custom min', () => expect(clampPercentage(0, 1)).toBe(1));
});

// ─── roundKelvin ──────────────────────────────────────────────────────────

describe('roundKelvin', () => {
  it('rounds to the nearest 100K', () => expect(roundKelvin(4350)).toBe(4400));
  it('rounds down when below midpoint', () => expect(roundKelvin(4349)).toBe(4300));
  it('returns exact value when already rounded', () => expect(roundKelvin(3000)).toBe(3000));
});

// ─── clampKelvin ──────────────────────────────────────────────────────────

describe('clampKelvin', () => {
  it('clamps below min', () => expect(clampKelvin(2000, 2700, 6500)).toBe(2700));
  it('clamps above max', () => expect(clampKelvin(7000, 2700, 6500)).toBe(6500));
  it('rounds and keeps in-range values', () => expect(clampKelvin(4350, 2700, 6500)).toBe(4400));
});

// ─── getBrightnessPercent ─────────────────────────────────────────────────

describe('getBrightnessPercent', () => {
  it('reads brightness_pct when present', () => {
    const entity = makeEntity({ attributes: { brightness_pct: 75 } });
    expect(getBrightnessPercent(entity)).toBe(75);
  });

  it('converts raw brightness (0-255) to percentage', () => {
    const entity = makeEntity({ attributes: { brightness: 128 } });
    expect(getBrightnessPercent(entity)).toBe(50);
  });

  it('converts fractional brightness (0-1) to percentage', () => {
    const entity = makeEntity({ attributes: { brightness: 0.5 } });
    expect(getBrightnessPercent(entity)).toBe(50);
  });

  it('returns 100 for an on entity with no brightness attribute', () => {
    const entity = makeEntity({ state: 'on', attributes: {} });
    expect(getBrightnessPercent(entity)).toBe(100);
  });

  it('returns 0 for an off entity with no brightness attribute', () => {
    const entity = makeEntity({ state: 'off', attributes: {} });
    expect(getBrightnessPercent(entity)).toBe(0);
  });

  it('clamps brightness_pct values outside 0-100', () => {
    const entity = makeEntity({ attributes: { brightness_pct: 110 } });
    expect(getBrightnessPercent(entity)).toBe(100);
  });
});

// ─── getReportedColorTempKelvin ───────────────────────────────────────────

describe('getReportedColorTempKelvin', () => {
  it('reads color_temp_kelvin directly', () => {
    const entity = makeEntity({ attributes: { color_temp_kelvin: 3000 } });
    expect(getReportedColorTempKelvin(entity)).toBe(3000);
  });

  it('converts mired color_temp to kelvin', () => {
    // 370 mired ≈ 2703 K → rounds to 2700
    const entity = makeEntity({ attributes: { color_temp: 370 } });
    expect(getReportedColorTempKelvin(entity)).toBe(2700);
  });

  it('returns null when no color temp attributes are present', () => {
    const entity = makeEntity({ attributes: {} });
    expect(getReportedColorTempKelvin(entity)).toBeNull();
  });

  it('returns null for zero mired (avoids division by zero)', () => {
    const entity = makeEntity({ attributes: { color_temp: 0 } });
    expect(getReportedColorTempKelvin(entity)).toBeNull();
  });
});

// ─── hexToRgb ─────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('parses a hex color with hash', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
  });

  it('parses a hex color without hash', () => {
    expect(hexToRgb('00ff00')).toEqual([0, 255, 0]);
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF8000')).toEqual([255, 128, 0]);
  });

  it('returns null for an invalid hex string', () => {
    expect(hexToRgb('#xyz')).toBeNull();
    expect(hexToRgb('12345')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});

// ─── rgbToHs ──────────────────────────────────────────────────────────────

describe('rgbToHs', () => {
  it('converts pure red to hue=0, saturation=100', () => {
    const [h, s] = rgbToHs([255, 0, 0]);
    expect(h).toBe(0);
    expect(s).toBe(100);
  });

  it('converts pure green to hue=120, saturation=100', () => {
    const [h, s] = rgbToHs([0, 255, 0]);
    expect(h).toBe(120);
    expect(s).toBe(100);
  });

  it('converts white to saturation=0', () => {
    const [, s] = rgbToHs([255, 255, 255]);
    expect(s).toBe(0);
  });

  it('clamps out-of-range channel values', () => {
    const [h, s] = rgbToHs([300, 0, 0] as unknown as [number, number, number]);
    expect(h).toBe(0);
    expect(s).toBe(100);
  });
});

// ─── rgbToXy ──────────────────────────────────────────────────────────────

describe('rgbToXy', () => {
  it('returns values in [0, 1] range', () => {
    const [x, y] = rgbToXy([255, 128, 0]);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThanOrEqual(1);
  });

  it('returns consistent chromaticity for pure white', () => {
    const [x, y] = rgbToXy([255, 255, 255]);
    // The function uses a Wide Gamut RGB matrix; white maps to x≈0.3227, y≈0.3290
    expect(x).toBeCloseTo(0.3227, 2);
    expect(y).toBeCloseTo(0.329, 2);
  });

  it('returns [0.3127, 0.329] for black (sum = 0)', () => {
    const [x, y] = rgbToXy([0, 0, 0]);
    expect(x).toBe(0.3127);
    expect(y).toBe(0.329);
  });
});

// ─── kelvinToColor ────────────────────────────────────────────────────────

describe('kelvinToColor', () => {
  it('returns the warm anchor at 2700K', () => {
    expect(kelvinToColor(2700)).toBe('#ffb366');
  });

  it('returns the cool anchor at 6500K', () => {
    expect(kelvinToColor(6500)).toBe('#e6f2ff');
  });

  it('clamps values below 2700K to the warm anchor', () => {
    expect(kelvinToColor(1000)).toBe(kelvinToColor(2700));
  });

  it('clamps values above 6500K to the cool anchor', () => {
    expect(kelvinToColor(9000)).toBe('#e6f2ff');
  });

  it('returns a valid hex string for midrange temperatures', () => {
    const color = kelvinToColor(4000);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
