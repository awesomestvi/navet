import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraSnapshotImage } from '../camera-snapshot-image';

describe('CameraSnapshotImage', () => {
  it('keeps the current image visible until a non-versioned replacement finishes loading', () => {
    const onError = vi.fn();
    const { rerender, container } = renderWithProviders(
      <CameraSnapshotImage
        src="https://cdn.example.test/camera/front-door.jpg?version=0"
        alt="Front Door"
        className="object-cover"
        onError={onError}
      />
    );

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/camera/front-door.jpg?version=0'
    );

    rerender(
      <CameraSnapshotImage
        src="https://cdn.example.test/camera/front-door.jpg?version=1"
        alt="Front Door"
        className="object-cover"
        onError={onError}
      />
    );

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/camera/front-door.jpg?version=0'
    );

    const pendingImage = container.querySelector('img[aria-hidden="true"]');
    expect(pendingImage).not.toBeNull();
    fireEvent.load(pendingImage as HTMLImageElement);

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/camera/front-door.jpg?version=1'
    );
  });

  it('swaps to cache-busted camera proxy snapshots immediately on refresh', () => {
    const onError = vi.fn();
    const { rerender, container } = renderWithProviders(
      <CameraSnapshotImage
        src="/api/camera_proxy/camera.front_door?_t=0"
        alt="Front Door"
        className="object-cover"
        onError={onError}
      />
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
      '/api/camera_proxy/camera.front_door?_t=1'
    );
    expect(container.querySelector('img[aria-hidden="true"]')).toBeNull();
  });
});
