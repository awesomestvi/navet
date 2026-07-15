import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhotoFrameSources } from './use-photo-frame-sources';

const { browseMediaSource, resolveMediaSource, resolvers } = vi.hoisted(() => ({
  browseMediaSource: vi.fn(),
  resolveMediaSource: vi.fn(),
  resolvers: new Map<string, (value: { url: string }) => void>(),
}));

vi.mock('@navet/app/services/integration-media-feature.service', () => ({
  integrationMediaFeatureService: {
    browseMediaSource,
    resolveMediaSource,
  },
}));

vi.mock('@navet/app/services/integration-resource.service', () => ({
  normalizeResourceUrl: (url: string) => url,
}));

describe('usePhotoFrameSources', () => {
  beforeEach(() => {
    browseMediaSource.mockReset();
    resolveMediaSource.mockReset();
    resolvers.clear();
  });

  it('resolves folder images with bounded concurrency while preserving source order', async () => {
    browseMediaSource.mockResolvedValue({
      mediaClass: 'directory',
      children: Array.from({ length: 6 }, (_, index) => ({
        mediaClass: 'image',
        mediaContentId: `image-${index + 1}`,
      })),
    });
    resolveMediaSource.mockImplementation(
      (mediaContentId: string) =>
        new Promise<{ url: string }>((resolve) => {
          resolvers.set(mediaContentId, resolve);
        })
    );

    const { result } = renderHook(() =>
      usePhotoFrameSources({
        sourceMode: 'home-assistant',
        mediaSourceId: 'media-source://photos',
      })
    );

    await waitFor(() => expect(resolveMediaSource).toHaveBeenCalledTimes(4));

    act(() => {
      for (const imageNumber of [4, 3, 2, 1]) {
        resolvers.get(`image-${imageNumber}`)?.({ url: `/photo-${imageNumber}.jpg` });
      }
    });
    await waitFor(() => expect(resolveMediaSource).toHaveBeenCalledTimes(6));

    act(() => {
      resolvers.get('image-6')?.({ url: '/photo-6.jpg' });
      resolvers.get('image-5')?.({ url: '/photo-5.jpg' });
    });

    await waitFor(() =>
      expect(result.current.activePhotoImages).toEqual(
        Array.from({ length: 6 }, (_, index) => ({ src: `/photo-${index + 1}.jpg` }))
      )
    );
  });
});
