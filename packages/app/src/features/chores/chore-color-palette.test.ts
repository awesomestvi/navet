import { describe, expect, it } from 'vitest';
import {
  choreColorPalettes,
  normalizeChoreColor,
  resolveChoreColorPalette,
} from './chore-color-palette';

describe('chore color palette', () => {
  it('assigns a stable automatic palette from the chore id', () => {
    const first = resolveChoreColorPalette('chore:take-out-trash');
    const again = resolveChoreColorPalette('chore:take-out-trash');

    expect(first).toEqual(again);
    expect(choreColorPalettes).toContainEqual(first);
    expect(choreColorPalettes).toHaveLength(12);
  });

  it('uses a valid user override without changing the stable secondary tone', () => {
    const automatic = resolveChoreColorPalette('chore:take-out-trash');

    expect(resolveChoreColorPalette('chore:take-out-trash', '#ABCDEF')).toEqual({
      primary: '#abcdef',
      secondary: automatic.secondary,
    });
  });

  it('ignores malformed overrides', () => {
    expect(normalizeChoreColor('blue')).toBeUndefined();
    expect(resolveChoreColorPalette('chore:laundry', 'blue')).toEqual(
      resolveChoreColorPalette('chore:laundry')
    );
  });
});
