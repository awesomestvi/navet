import { OPENFREEMAP_DARK_STYLE_URL, OPENFREEMAP_LIGHT_STYLE_URL } from '@navet/app/constants';
import { describe, expect, it } from 'vitest';
import { getMapStyleUrl } from '../map-tiles';

describe('map tiles', () => {
  it('uses the OpenFreeMap light style only for the light theme', () => {
    expect(getMapStyleUrl('light')).toBe(OPENFREEMAP_LIGHT_STYLE_URL);
    expect(getMapStyleUrl('dark')).toBe(OPENFREEMAP_DARK_STYLE_URL);
    expect(getMapStyleUrl('black')).toBe(OPENFREEMAP_DARK_STYLE_URL);
    expect(getMapStyleUrl('glass')).toBe(OPENFREEMAP_DARK_STYLE_URL);
  });
});
