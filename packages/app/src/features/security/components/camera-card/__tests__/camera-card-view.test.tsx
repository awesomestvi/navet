import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraCardView } from '../view';

const defaultProps = {
  id: 'camera.front_door',
  name: 'Front Door',
  room: 'Entrance',
  imageUrl: '/api/camera_proxy/camera.front_door?_t=0',
  cameraState: 'streaming' as const,
  statusChangedAt: null,
  motionDetected: false,
  motionChangedAt: null,
  motionDetectionEnabled: null,
  now: Date.now(),
  size: 'medium' as const,
  isEditMode: false,
  cameraViewMode: 'auto' as const,
  fitMode: 'cover' as const,
  isStreamCapable: true,
  frontendStreamTypes: [],
  streamKind: 'snapshot' as const,
  isStreamFallback: false,
  onRefresh: vi.fn(),
  onImageError: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenViewer: vi.fn(),
  onToggleMotionDetection: vi.fn(),
};

describe('CameraCardView', () => {
  it('opens the large viewer when the card body is clicked', () => {
    const onOpenViewer = vi.fn();

    renderWithProviders(<CameraCardView {...defaultProps} onOpenViewer={onOpenViewer} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open camera viewer' }));

    expect(onOpenViewer).toHaveBeenCalledTimes(1);
  });

  it('keeps utility buttons from opening the large viewer', () => {
    const onOpenViewer = vi.fn();
    const onRefresh = vi.fn();

    renderWithProviders(
      <CameraCardView
        {...defaultProps}
        cameraViewMode="snapshot"
        onOpenViewer={onOpenViewer}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh camera snapshot' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpenViewer).not.toHaveBeenCalled();
  });

  it('shows live status from the normalized camera state instead of the view-mode label', () => {
    renderWithProviders(<CameraCardView {...defaultProps} cameraViewMode="auto" />);

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Auto')).not.toBeInTheDocument();
  });

  it('does not render the snapshot image layer when a live stream element is present', () => {
    renderWithProviders(
      <CameraCardView
        {...defaultProps}
        streamElement={<div data-testid="camera-stream-player">live stream</div>}
      />
    );

    expect(screen.getByTestId('camera-stream-player')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Front Door' })).not.toBeInTheDocument();
  });

  it('renders snapshot imagery in contain mode when fit is selected', () => {
    renderWithProviders(<CameraCardView {...defaultProps} fitMode="contain" />);

    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveClass('object-contain');
    expect(screen.getByRole('img', { name: 'Front Door' })).not.toHaveClass('object-cover');
  });

  it('does not render the bottom camera vignette', () => {
    const { container } = renderWithProviders(<CameraCardView {...defaultProps} />);

    expect(container.querySelector('.bg-gradient-to-t')).toBeNull();
  });
});
