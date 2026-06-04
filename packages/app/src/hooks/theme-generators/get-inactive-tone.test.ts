import { describe, expect, it } from 'vitest';
import { getInactiveThemeTone } from './get-inactive-tone';

describe('getInactiveThemeTone', () => {
  it('uses the lighter shared glass shell border for glass inactive states', () => {
    expect(getInactiveThemeTone('glass')).toMatchObject({
      border: 'border-white/22',
      iconBg: 'bg-white/14',
      accent: 'text-white/74',
      glow: 'transparent',
    });
  });
});
