import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPaletteFromImageData,
  getPaletteLuminance,
  getPaletteSaturation,
  resolveArtworkPalette,
} from '../media-artwork-palette';

function expectPalette(
  palette: ReturnType<typeof createPaletteFromImageData>
): NonNullable<ReturnType<typeof createPaletteFromImageData>> {
  expect(palette).not.toBeNull();

  if (!palette) {
    throw new Error('Expected media artwork palette to be resolved');
  }

  return palette;
}

function createSyntheticImageData(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number, number]
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [r, g, b, a] = colorAt(x, y);
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    }
  }

  return {
    data,
    width,
    height,
  } as ImageData;
}

describe('resolveArtworkPalette', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('samples already resolved blob artwork without fetching again', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const RealImage = globalThis.Image;
    const originalCreateElement = document.createElement.bind(document);

    class SuccessfulImage {
      decoding = 'async';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    const canvasContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([120, 90, 70, 255]),
      })),
    };
    const createElementMock = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string
    ) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => canvasContext),
          width: 0,
          height: 0,
        } as unknown as HTMLCanvasElement;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    try {
      // @ts-expect-error test image stub
      globalThis.Image = SuccessfulImage;

      const palette = await resolveArtworkPalette({
        url: 'blob:http://navet.local/resolved-artwork',
        cacheKey: 'track-a',
        authStrategy: 'none',
        source: 'artwork_object_url',
      });

      expect(palette).toMatchObject({
        dominant: 'rgb(120, 90, 70)',
      });
      expect(palette?.vibrant).toMatch(/^rgb\(/);
      expect(palette?.darkMuted).toMatch(/^rgb\(/);
      expect(palette?.highlight).toMatch(/^rgb\(/);
      expect(palette?.gradientEnd).toMatch(/^rgb\(/);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.Image = RealImage;
      createElementMock.mockRestore();
    }
  });

  it('returns null instead of refetching when a direct public artwork URL cannot be sampled', async () => {
    const RealImage = globalThis.Image;
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    class FailingImage {
      decoding = 'async';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }

    try {
      // @ts-expect-error test image stub
      globalThis.Image = FailingImage;

      await expect(
        resolveArtworkPalette({
          url: 'https://cdn.example.test/album-art.jpg',
          authStrategy: 'none',
          source: 'external',
        })
      ).resolves.toBeNull();

      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.Image = RealImage;
    }
  });

  it('falls back to a single authenticated fetch when direct sampling fails for a protected resource', async () => {
    const RealImage = globalThis.Image;
    const originalCreateElement = document.createElement.bind(document);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('image', {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );
    const createObjectUrlMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://navet.local/fetched-artwork');
    const revokeObjectUrlMock = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    class FailingThenSuccessfulImage {
      static loadCount = 0;
      decoding = 'async';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(value: string) {
        queueMicrotask(() => {
          if (value.startsWith('blob:')) {
            this.onload?.();
            return;
          }

          FailingThenSuccessfulImage.loadCount += 1;
          this.onerror?.();
        });
      }
    }

    const canvasContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([96, 120, 144, 255]),
      })),
    };
    const createElementMock = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string
    ) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => canvasContext),
          width: 0,
          height: 0,
        } as unknown as HTMLCanvasElement;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    try {
      // @ts-expect-error test image stub
      globalThis.Image = FailingThenSuccessfulImage;

      const palette = await resolveArtworkPalette({
        url: '/api/media_player_proxy/media_player.kitchen?authSig=signed-artwork-token',
        authStrategy: 'same_origin',
        source: 'ha_panel_relative',
      });

      expect(palette?.dominant).toMatch(/^rgb\(/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/media_player_proxy/media_player.kitchen?authSig=signed-artwork-token',
        {
          credentials: 'same-origin',
          mode: 'cors',
        }
      );
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://navet.local/fetched-artwork');
    } finally {
      globalThis.Image = RealImage;
      createElementMock.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('keeps dark-background artwork with bright text anchored to a dark surface', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      const centerText = x >= 12 && x <= 35 && y >= 15 && y <= 30;
      return centerText ? [244, 239, 232, 255] : [24, 12, 14, 255];
    });

    const palette = expectPalette(createPaletteFromImageData(imageData));

    expect(getPaletteLuminance(palette.dominant)).toBeLessThan(0.2);
    expect(getPaletteLuminance(palette.gradientEnd)).toBeLessThan(0.12);
    expect(getPaletteLuminance(palette.highlight)).toBeGreaterThan(
      getPaletteLuminance(palette.dominant)
    );
  });

  it('mutes vivid blue accents when the artwork base is dark', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      const inBlueMark = x >= 8 && x <= 20 && y >= 8 && y <= 22;
      return inBlueMark ? [22, 182, 240, 255] : [20, 18, 24, 255];
    });

    const palette = expectPalette(createPaletteFromImageData(imageData));

    expect(getPaletteLuminance(palette.dominant)).toBeLessThan(0.18);
    expect(getPaletteLuminance(palette.gradientEnd)).toBeLessThan(0.12);
    expect(getPaletteSaturation(palette.vibrant)).toBeLessThan(0.6);
    expect(getPaletteLuminance(palette.vibrant)).toBeLessThan(0.42);
  });

  it('still allows genuinely light-led artwork to resolve to a light palette', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      const softShadow = x >= 10 && x <= 36 && y >= 12 && y <= 34;
      return softShadow ? [204, 192, 176, 255] : [244, 240, 232, 255];
    });

    const palette = expectPalette(createPaletteFromImageData(imageData));

    expect(getPaletteLuminance(palette.dominant)).toBeGreaterThan(0.5);
    expect(getPaletteLuminance(palette.highlight)).toBeGreaterThan(0.7);
    expect(getPaletteLuminance(palette.gradientEnd)).toBeGreaterThan(0.28);
  });
});
