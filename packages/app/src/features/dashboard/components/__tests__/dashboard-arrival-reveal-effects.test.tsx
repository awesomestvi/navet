import { renderWithProviders } from '@navet/app/test/render';
import { describe, expect, it } from 'vitest';
import { RevealEffects } from '../dashboard-arrival-reveal-effects';
import type { DashboardArrivalRevealController } from '../use-dashboard-arrival-reveal';

function createController(
  overrides: Partial<DashboardArrivalRevealController> = {}
): DashboardArrivalRevealController {
  return {
    accentColor: '#88aaff',
    backdropColor: '#000000',
    copy: {
      bakingKicker: 'baking',
      bakingHeading: 'heading',
      bakingBody: 'body',
      revealKicker: 'reveal',
      revealHeading: 'heading',
      revealBody: 'body',
      enter: 'enter',
    },
    effectsQuality: 'high',
    phase: 'revealed',
    revealButtonBackground: '#88aaff',
    revealButtonShadow: 'none',
    setPhase: () => undefined,
    subtleColor: '#99aabb',
    textColor: '#ffffff',
    theme: 'dark',
    ...overrides,
  };
}

describe('RevealEffects', () => {
  it('does not mount looping reveal rings when effective quality is low', () => {
    const { container } = renderWithProviders(
      <RevealEffects controller={createController({ effectsQuality: 'low' })} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders animated reveal rings when effective quality stays high', () => {
    const { container } = renderWithProviders(<RevealEffects controller={createController()} />);

    expect(container.querySelectorAll('[style*="navet-dashboard-reveal-ring"]').length).toBe(3);
  });
});
