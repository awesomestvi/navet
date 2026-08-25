import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CameraStreamLoadingIndicator } from '../camera-stream-loading-indicator';

describe('CameraStreamLoadingIndicator', () => {
  it('keeps a broken relative poster hidden behind the Navet loading surface', () => {
    const { container } = renderWithProviders(
      <CameraStreamLoadingIndicator
        label="Loading camera feed"
        posterUrl="/api/camera_proxy/camera.front"
        fitMode="cover"
      />
    );

    const poster = container.querySelector('img');
    expect(poster).not.toBeNull();
    expect(poster).toHaveClass('opacity-0');

    fireEvent.error(poster as HTMLImageElement);

    expect(poster).toHaveClass('opacity-0');
    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();
  });

  it('reveals an authenticated absolute poster only after it loads', () => {
    const { container } = renderWithProviders(
      <CameraStreamLoadingIndicator
        label="Loading camera feed"
        posterUrl="https://camera.example.test/snapshot.jpg?authSig=signed-token"
        fitMode="contain"
      />
    );

    const poster = container.querySelector('img');
    expect(poster).not.toBeNull();
    expect(poster).toHaveClass('opacity-0');

    fireEvent.load(poster as HTMLImageElement);

    expect(poster).toHaveClass('opacity-100');
    expect(poster).toHaveAttribute(
      'src',
      'https://camera.example.test/snapshot.jpg?authSig=signed-token'
    );
  });
});
