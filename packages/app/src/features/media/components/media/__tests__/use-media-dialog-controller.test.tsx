import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaDialogController } from '../use-media-dialog-controller';

const { useThemeMock, useMediaArtworkColorsMock } = vi.hoisted(() => ({
  useThemeMock: vi.fn(),
  useMediaArtworkColorsMock: vi.fn(),
}));

vi.mock('@navet/app/hooks', () => ({
  useTheme: () => useThemeMock(),
}));

vi.mock('../use-media-artwork-colors', async () => {
  const actual = await vi.importActual<typeof import('../use-media-artwork-colors')>(
    '../use-media-artwork-colors'
  );

  return {
    ...actual,
    useMediaArtworkColors: useMediaArtworkColorsMock,
  };
});

describe('useMediaDialogController', () => {
  it('switches dialog text to a dark readable foreground for bright glass palettes', () => {
    useThemeMock.mockReturnValue({ theme: 'glass' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(238, 233, 224)',
      vibrant: 'rgb(214, 198, 176)',
      darkMuted: 'rgb(123, 114, 104)',
      highlight: 'rgb(251, 246, 238)',
      gradientEnd: 'rgb(228, 220, 208)',
    });

    const { result } = renderHook(() =>
      useMediaDialogController({
        artwork: 'data:image/jpeg;base64,art',
        artworkResource: null,
        artist: 'Artist',
        durationSeconds: 213,
        elapsedSeconds: 12,
        entityId: 'media_player.walkman',
        repeatMode: 'off',
        shuffleEnabled: false,
        title: 'Track',
      })
    );

    expect(result.current.readableForeground.titleColor).toBe('#1f2937');
    expect(result.current.readableForeground.subtitleColor).toBe('#334155');
  });
});
