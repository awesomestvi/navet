import { EffectiveEffectsQualityProvider } from '@navet/app/components/shared/theme/effective-effects-quality';
import { renderWithProviders } from '@navet/app/test/render';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaArtworkSurface } from '../media-artwork-surface';
import { MediaSmallView } from '../media-small-view';
import type { MediaArtworkPalette } from '../use-media-artwork-colors';

const palette: MediaArtworkPalette = {
  dominant: 'rgb(30, 41, 59)',
  vibrant: 'rgb(249, 115, 22)',
  darkMuted: 'rgb(15, 23, 42)',
  highlight: 'rgb(248, 250, 252)',
  gradientEnd: 'rgb(17, 24, 39)',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MediaArtworkSurface effects quality', () => {
  it('keeps low-quality artwork readable without edge sampling, masks, or decorative layers', () => {
    const imageConstructor = vi.fn();
    vi.stubGlobal('Image', imageConstructor);

    const { container } = render(
      <EffectiveEffectsQualityProvider value="low">
        <MediaArtworkSurface
          artwork="https://example.test/artwork.jpg"
          palette={palette}
          theme="glass"
          layout="split"
          imagePaddingClassName=""
        />
      </EffectiveEffectsQualityProvider>
    );

    const image = container.querySelector('img');
    const surface = container.querySelector('[data-media-artwork-surface="low"]');
    const paintLayers = container.querySelectorAll('[data-media-paint-layer]');

    expect(surface).not.toBeNull();
    expect(image).not.toBeNull();
    expect(image?.style.maskImage).toBe('');
    expect(image?.style.webkitMaskImage).toBe('');
    expect(imageConstructor).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[data-media-decorative-layer]')).toHaveLength(0);
    expect(paintLayers.length).toBeLessThanOrEqual(2);
  });

  it('bounds low-quality media cards to a base and readability paint layer', () => {
    const imageConstructor = vi.fn();
    vi.stubGlobal('Image', imageConstructor);

    const { container } = renderWithProviders(
      <EffectiveEffectsQualityProvider value="low">
        <MediaSmallView
          entityId="media_player.kitchen"
          artwork="https://example.test/artwork.jpg"
          entityName="Kitchen"
          entityTypeKey="media.type.speaker"
          title="Track"
          artist="Artist"
          isActive
          isPlaying={false}
          volume={0.4}
          isMuted={false}
          elapsedSeconds={12}
          durationSeconds={120}
          theme="glass"
          hideTransportControls
          onToggleMute={vi.fn()}
          onPrevious={vi.fn()}
          canPreviousTrack={false}
          onTogglePlay={vi.fn()}
          canTogglePlayback={false}
          onNext={vi.fn()}
          canNextTrack={false}
          canSeek={false}
          onSeek={vi.fn()}
          onVolumeChange={vi.fn()}
          onVolumeInteractionStart={vi.fn()}
          onVolumeInteractionEnd={vi.fn()}
          onOpenDialog={vi.fn()}
        />
      </EffectiveEffectsQualityProvider>
    );

    const mediaCard = container.querySelector('[data-media-effects-quality="low"]');
    const artwork = mediaCard?.querySelector('img');

    expect(mediaCard?.querySelectorAll('[data-media-paint-layer]')).toHaveLength(2);
    expect(mediaCard?.querySelectorAll('[data-media-decorative-layer]')).toHaveLength(0);
    expect(artwork?.className).not.toContain('saturate');
    expect(artwork?.className).not.toContain('contrast');
    expect(imageConstructor).not.toHaveBeenCalled();
  });
});
