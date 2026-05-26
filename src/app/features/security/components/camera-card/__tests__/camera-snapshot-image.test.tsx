import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { CameraSnapshotImage } from '../camera-snapshot-image';

describe('CameraSnapshotImage', () => {
  it('keeps the current snapshot visible until the refreshed snapshot finishes loading', () => {
    const onError = vi.fn();
    const { rerender, container } = renderWithProviders(
      <CameraSnapshotImage
        src="/api/camera_proxy/camera.front_door?_t=0"
        alt="Front Door"
        className="object-cover"
        onError={onError}
      />
    );

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      '/api/camera_proxy/camera.front_door?_t=0'
    );

    rerender(
      <CameraSnapshotImage
        src="/api/camera_proxy/camera.front_door?_t=1"
        alt="Front Door"
        className="object-cover"
        onError={onError}
      />
    );

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      '/api/camera_proxy/camera.front_door?_t=0'
    );

    const pendingImage = container.querySelector('img[aria-hidden="true"]');
    expect(pendingImage).not.toBeNull();
    fireEvent.load(pendingImage as HTMLImageElement);

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      '/api/camera_proxy/camera.front_door?_t=1'
    );
  });
});
