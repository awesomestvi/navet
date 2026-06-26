import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraCardView } from '../view';

const baseNow = new Date('2026-06-26T12:00:00.000Z').getTime();

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
  now: baseNow,
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

  it('does not show a live text label in the status row', () => {
    renderWithProviders(
      <CameraCardView
        {...defaultProps}
        cameraViewMode="auto"
        statusChangedAt={baseNow - 4 * 60_000}
      />
    );

    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Auto')).not.toBeInTheDocument();
    expect(screen.queryByText('No motion')).not.toBeInTheDocument();
    expect(screen.getByText('4m')).toBeInTheDocument();
  });

  it('shows motion text only when motion is detected', () => {
    renderWithProviders(
      <CameraCardView {...defaultProps} motionDetected motionChangedAt={baseNow - 30_000} />
    );

    expect(screen.getByText('Motion')).toBeInTheDocument();
  });

  it('shows a snapshot label when the dashboard card is rendering a still image', () => {
    renderWithProviders(<CameraCardView {...defaultProps} cameraViewMode="snapshot" />);

    expect(screen.getByText('Snapshot')).toBeInTheDocument();
  });

  it('shows RTC for WebRTC dashboard playback labels', () => {
    renderWithProviders(
      <CameraCardView {...defaultProps} streamKind="web_rtc" frontendStreamTypes={['web_rtc']} />
    );

    expect(screen.getByText('RTC')).toBeInTheDocument();
    expect(screen.queryByText('WEB_RTC')).not.toBeInTheDocument();
  });

  it('does not show the generic on label when the camera is merely idle', () => {
    renderWithProviders(<CameraCardView {...defaultProps} cameraState="idle" />);

    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('keeps mounted live streams free of a redundant live text label', () => {
    renderWithProviders(
      <CameraCardView
        {...defaultProps}
        cameraState="idle"
        statusChangedAt={baseNow - 13 * 60 * 60_000}
        streamKind="web_rtc"
        frontendStreamTypes={['web_rtc']}
        streamElement={<div data-testid="camera-stream-player">live stream</div>}
      />
    );

    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.getByText('13h')).toBeInTheDocument();
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

  it('falls back to the empty unavailable state when the snapshot image fails', () => {
    const onImageError = vi.fn();

    renderWithProviders(
      <CameraCardView
        {...defaultProps}
        cameraState="unavailable"
        statusChangedAt={baseNow - 4 * 60_000}
        onImageError={onImageError}
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Front Door' }));

    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('img', { name: 'Front Door' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Unavailable')).toHaveLength(1);
    expect(screen.getByText('4m')).toBeInTheDocument();
    expect(screen.getByText('Snapshot')).toBeInTheDocument();
  });

  it('does not render the bottom camera vignette', () => {
    const { container } = renderWithProviders(<CameraCardView {...defaultProps} />);

    expect(container.querySelector('.bg-gradient-to-t')).toBeNull();
  });
});
