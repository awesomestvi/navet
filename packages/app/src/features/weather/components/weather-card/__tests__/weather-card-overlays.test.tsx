import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RainOverlaySvg } from '../rain-overlay';
import { WeatherBackground } from '../weather-card-overlays';

function countPathSegments(paths: NodeListOf<SVGPathElement>) {
  return Array.from(paths).reduce(
    (count, path) => count + (path.getAttribute('d')?.match(/\bM\s/g)?.length ?? 0),
    0
  );
}

describe('weather card overlays', () => {
  it('preserves the full high-quality rain treatment', () => {
    const { container } = render(
      <RainOverlaySvg size="large" intensity="rain" effectsQuality="high" />
    );

    expect(container.querySelectorAll('line')).toHaveLength(1656);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('uses a small, path-batched rain overlay at low quality', () => {
    const { container } = render(
      <RainOverlaySvg size="large" intensity="storm" effectsQuality="low" />
    );
    const overlay = container.querySelector('[data-weather-overlay="rain"]');
    const rainPaths = container.querySelectorAll<SVGPathElement>('[data-rain-depth]');

    expect(overlay).not.toBeNull();
    expect(container.querySelectorAll('line')).toHaveLength(0);
    expect(rainPaths).toHaveLength(3);
    expect(countPathSegments(rainPaths)).toBeLessThanOrEqual(49);
    expect(overlay?.querySelectorAll('*').length).toBeLessThan(50);
  });

  it('removes storm blend and filter effects while keeping the full low-quality scene compact', () => {
    const { container } = render(
      <WeatherBackground
        condition="thunderstorm"
        effectsQuality="low"
        hasCustomTint={false}
        size="large"
        theme="dark"
      />
    );
    const lightning = container.querySelector('[data-weather-overlay="lightning"]');

    expect(lightning).not.toHaveClass('mix-blend-screen');
    expect(lightning?.querySelector('filter')).toBeNull();
    expect(container.querySelectorAll('svg, svg *').length).toBeLessThan(50);
  });

  it('preserves high-quality storm blend, glow, and dense rainfall', () => {
    const { container } = render(
      <WeatherBackground
        condition="thunderstorm"
        effectsQuality="high"
        hasCustomTint={false}
        size="large"
        theme="dark"
      />
    );
    const lightning = container.querySelector('[data-weather-overlay="lightning"]');

    expect(lightning).toHaveClass('mix-blend-screen');
    expect(lightning?.querySelector('filter')).not.toBeNull();
    expect(container.querySelectorAll('[data-weather-overlay="rain"] line')).toHaveLength(1984);
  });
});
