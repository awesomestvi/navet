import { describe, expect, it } from 'vitest';
import { getInteractivePillStyles } from '../interactive-pill-styles';

describe('getInteractivePillStyles', () => {
  it('keeps active light-theme pills on a white surface with an accent border', () => {
    const pill = getInteractivePillStyles({
      accentColor: '#22c55e',
      isActive: true,
      primaryColor: 'green',
      theme: 'light',
    });

    expect(pill.className).toContain('bg-white');
    expect(pill.style).toMatchObject({
      backgroundColor: '#ffffff',
      borderColor: '#22c55e80',
    });
    expect(String(pill.style?.boxShadow)).not.toContain('999px');
  });
});
