import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { CameraLiveViewer } from '../camera-live-viewer';

const defaultProps = {
  isOpen: true,
  onOpenChange: vi.fn(),
  entityId: 'camera.front_door',
  name: 'Front Door',
  room: 'Entrance',
  snapshotUrl: '/api/camera_proxy/camera.front_door?_t=0',
  mjpegStreamUrl: '/api/camera_proxy_stream/camera.front_door?_t=0',
  cameraViewMode: 'auto' as const,
  cameraFeedMode: 'auto' as const,
  isUnavailable: false,
  isRunning: true,
  isStreamCapable: true,
  frontendStreamTypes: [],
  homeAssistantUrl: undefined,
  onRefresh: vi.fn(),
  onOpenSettings: vi.fn(),
  onCameraViewModeChange: vi.fn(),
};

describe('CameraLiveViewer', () => {
  it('lets the viewer switch camera view modes', () => {
    const onCameraViewModeChange = vi.fn();

    renderWithProviders(
      <CameraLiveViewer {...defaultProps} onCameraViewModeChange={onCameraViewModeChange} />
    );

    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }));

    expect(onCameraViewModeChange).toHaveBeenCalledWith('snapshot');
  });
});
