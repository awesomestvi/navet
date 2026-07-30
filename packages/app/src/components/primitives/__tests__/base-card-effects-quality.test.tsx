import { EffectiveEffectsQualityProvider } from '@navet/app/components/shared/theme/effective-effects-quality';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BaseCard } from '../base-card';

function renderGlassCard(effectsQuality: 'high' | 'medium' | 'low') {
  return render(
    <EffectiveEffectsQualityProvider value={effectsQuality}>
      <BaseCard size="small" themeOverride="glass">
        Content
      </BaseCard>
    </EffectiveEffectsQualityProvider>
  );
}

describe('BaseCard effects quality', () => {
  it('omits glass blur and the sheen node at low quality', () => {
    const { container } = renderGlassCard('low');
    const card = container.firstElementChild;

    expect(card).toHaveAttribute('data-effective-effects-quality', 'low');
    expect(card?.className).not.toContain('backdrop-blur');
    expect(container.querySelector('[data-card-sheen="true"]')).toBeNull();
  });

  it.each(['medium', 'high'] as const)(
    'preserves the glass treatment at %s quality',
    (effectsQuality) => {
      const { container } = renderGlassCard(effectsQuality);
      const card = container.firstElementChild;

      expect(card).toHaveAttribute('data-effective-effects-quality', effectsQuality);
      expect(card?.className).toContain('backdrop-blur-2xl');
      expect(container.querySelector('[data-card-sheen="true"]')).not.toBeNull();
    }
  );
});
