import { Home, ListChecks, Zap } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { resolveCardIconAppearance } from './card-icon-appearance';

describe('card icon appearance', () => {
  it('resolves saved Lucide names and aliases before the card fallback', () => {
    expect(resolveCardIconAppearance('list-checks', Zap)).toEqual({
      iconComponent: ListChecks,
      iconText: null,
    });
    expect(resolveCardIconAppearance('HOME', Zap)).toEqual({
      iconComponent: Home,
      iconText: null,
    });
  });

  it('preserves emoji and falls back for an unknown saved icon', () => {
    expect(resolveCardIconAppearance(' 🏠 ', Zap)).toEqual({
      iconComponent: null,
      iconText: '🏠',
    });
    expect(resolveCardIconAppearance('missing-icon', Zap)).toEqual({
      iconComponent: Zap,
      iconText: null,
    });
  });
});
