import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { CameraCardView } from '../view';

const defaultProps = {
  id: 'camera.front_door',
  name: 'Front Door',
  room: 'Entrance',
  imageUrl: '/api/camera_proxy/camera.front_door?_t=0',
  isUnavailable: false,
  isRunning: true,
  statusChangedAt: null,
  motionDetected: false,
  motionChangedAt: null,
  motionDetectionEnabled: null,
  now: Date.now(),
  size: 'medium' as const,
  isEditMode: false,
  cameraViewMode: 'auto' as const,
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
      <CameraCardView {...defaultProps} onOpenViewer={onOpenViewer} onRefresh={onRefresh} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh camera snapshot' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpenViewer).not.toHaveBeenCalled();
  });

  it('shows the selected camera view mode when the camera is running', () => {
    renderWithProviders(<CameraCardView {...defaultProps} cameraViewMode="auto" />);

    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
