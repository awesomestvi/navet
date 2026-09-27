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

function luminance(color: string) {
  const channels = color.startsWith('#')
    ? [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16))
    : parseRgbChannels(color);
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe('useMediaDialogController', () => {
  it.each(['dark', 'black', 'light'] as const)(
    'keeps text readable on the %s dialog with bright placeholder artwork',
    (theme) => {
      useThemeMock.mockReturnValue({ theme });
      useMediaArtworkColorsMock.mockReturnValue({
        dominant: 'rgb(198, 206, 229)',
        vibrant: 'rgb(198, 206, 229)',
        darkMuted: 'rgb(198, 206, 229)',
        highlight: 'rgb(255, 255, 255)',
        gradientEnd: 'rgb(198, 206, 229)',
      });

      const { result } = renderHook(() =>
        useMediaDialogController({
          artwork: 'data:image/png;base64,placeholder',
          artworkResource: null,
          artist: 'Technohead',
          durationSeconds: 213,
          elapsedSeconds: 0,
          entityId: 'media_player.kitchen',
          title: 'I Wanna Be A Hippy',
        })
      );

      // Sample the rendered top/bottom surface, including the artwork tint.
      const backgrounds =
        theme === 'light'
          ? ['#ffffff']
          : theme === 'black'
            ? ['rgb(12, 12, 14)', '#000000']
            : ['rgb(48, 49, 55)', 'rgb(24, 25, 28)'];
      for (const background of backgrounds) {
        expect(
          contrast(result.current.readableForeground.titleColor, background)
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(result.current.readableForeground.subtitleColor, background)
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

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

  it('keeps artwork-tinted dark dialogs opaque', () => {
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(190, 200, 215)',
      vibrant: 'rgb(150, 165, 188)',
      darkMuted: 'rgb(48, 54, 66)',
      highlight: 'rgb(240, 244, 250)',
      gradientEnd: 'rgb(18, 22, 29)',
    });

    const { result } = renderHook(() =>
      useMediaDialogController({
        artwork: 'data:image/jpeg;base64,art',
        artworkResource: null,
        artist: 'Manchester Orchestra',
        durationSeconds: 308,
        elapsedSeconds: 42,
        entityId: 'media_player.bathroom',
        title: 'The Silence',
      })
    );

    expect(result.current.dialogSurfaceStyle.backgroundColor).toBe('#18181b');
    expect(result.current.dialogSurfaceStyle.background).toContain('rgba(24,24,27,0.995)');
    expect(result.current.dialogSurfaceStyle.background).not.toContain('rgba(0,0,0,0.035)');
  });
});
