import { Home, ListChecks, SunMedium, Zap } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { normalizeLightIconName, resolveLightIconComponent } from './icon-map';

describe('stored icon names', () => {
  it('keeps built-in aliases and case-insensitive Lucide names resolvable', () => {
    expect(resolveLightIconComponent('sun')).toBe(SunMedium);
    expect(resolveLightIconComponent('zap')).toBe(Zap);
    expect(normalizeLightIconName('list-checks')).toBe('ListChecks');
    expect(resolveLightIconComponent('list-checks')).toBe(ListChecks);
    expect(resolveLightIconComponent('HOME')).toBe(Home);
  });

  it('does not treat unknown names or emoji as Lucide components', () => {
    expect(resolveLightIconComponent('unknown-icon-name')).toBeNull();
    expect(resolveLightIconComponent('🏠')).toBeNull();
  });
});
