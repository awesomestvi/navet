import {
  BUILT_IN_WALLPAPER_IDS,
  BUILT_IN_WALLPAPERS,
  resolveBuiltInWallpaperDescriptor,
  resolveBuiltInWallpaperToken,
  resolveWallpaperBackgroundImage,
  resolveWallpaperPreviewSources,
  toBuiltInWallpaperToken,
} from '@navet/app/constants/built-in-wallpapers';
import { describe, expect, it } from 'vitest';

describe('built-in wallpapers', () => {
  it('resolves every built-in wallpaper descriptor from the generated manifest', () => {
    expect(BUILT_IN_WALLPAPERS).toHaveLength(BUILT_IN_WALLPAPER_IDS.length);

    for (const id of BUILT_IN_WALLPAPER_IDS) {
      const descriptor = resolveBuiltInWallpaperDescriptor(id);
      expect(descriptor).not.toBeNull();
      expect(descriptor?.token).toBe(toBuiltInWallpaperToken(id));
      expect(descriptor?.avifSrc).toContain(`/wallpapers/generated/${id}.avif`);
      expect(descriptor?.webpSrc).toContain(`/wallpapers/generated/${id}.webp`);
      expect(descriptor?.width).toBe(1920);
      expect(descriptor?.height).toBe(1080);
    }
  });

  it('normalizes legacy built-in wallpaper values to stable tokens', () => {
    expect(resolveBuiltInWallpaperToken('preset:soft-dark-gradient')).toBe(
      'builtin:aurora-haze-01'
    );
    expect(resolveBuiltInWallpaperToken('/wallpapers/luxury-living-room-ambient.svg')).toBe(
      'builtin:aurora-haze-04'
    );
    expect(resolveBuiltInWallpaperToken('/wallpapers/aurora-haze-01.png')).toBe(
      'builtin:aurora-haze-01'
    );
    expect(resolveBuiltInWallpaperToken('/wallpapers/generated/nocturne-07.avif')).toBe(
      'builtin:nocturne-07'
    );
  });

  it('builds image-set CSS for built-in wallpapers and plain url CSS for custom wallpapers', () => {
    expect(resolveWallpaperBackgroundImage('builtin:aurora-haze-01')).toContain('image-set(');
    expect(resolveWallpaperBackgroundImage('builtin:aurora-haze-01')).toContain('image/avif');
    expect(resolveWallpaperBackgroundImage('https://example.com/wallpaper.jpg')).toBe(
      'url("https://example.com/wallpaper.jpg")'
    );
  });

  it('returns preview sources for built-in and custom wallpapers', () => {
    const builtInPreview = resolveWallpaperPreviewSources('builtin:aurora-haze-01');
    expect(builtInPreview).toMatchObject({
      kind: 'builtin',
      token: 'builtin:aurora-haze-01',
    });

    const customPreview = resolveWallpaperPreviewSources('/wallpapers/custom-upload.jpg');
    expect(customPreview).toEqual({
      kind: 'custom',
      imgSrc: '/wallpapers/custom-upload.jpg',
    });
  });
});
