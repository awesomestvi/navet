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

function parseRgbChannels(color: string) {
  const matches = color.match(/\d+(\.\d+)?/g) ?? [];
  return matches.slice(0, 3).map((value) => Number.parseFloat(value));
}

describe('useMediaDialogController', () => {
  it('switches dialog text to a darker readable foreground for bright glass palettes', () => {
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
        title: 'Track',
      })
    );

    const titleChannels = parseRgbChannels(result.current.readableForeground.titleColor);
    const subtitleChannels = parseRgbChannels(result.current.readableForeground.subtitleColor);

    expect(titleChannels.length).toBe(3);
    expect(subtitleChannels.length).toBe(3);
    expect(Math.max(...titleChannels)).toBeLessThan(180);
    expect(Math.max(...subtitleChannels)).toBeLessThan(180);
  });

  it('keeps the idle dialog on an opaque dark surface outside the glass theme', () => {
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    const { result } = renderHook(() =>
      useMediaDialogController({
        artwork: null,
        artworkResource: null,
        artist: '',
        durationSeconds: 0,
        elapsedSeconds: 0,
        entityId: 'media_player.living_room_tv',
        title: 'LG webOS TV',
      })
    );

    expect(result.current.dialogSurfaceStyle.background).toContain('rgba(24,24,27,0.985)');
    expect(result.current.dialogSurfaceStyle.background).not.toContain('rgba(0,0,0,0.24)');
  });
});
