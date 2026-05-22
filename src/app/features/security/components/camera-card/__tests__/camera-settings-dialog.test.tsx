import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { CameraSettingsDialog } from '../camera-settings-dialog';

const defaultProps = {
  entityId: 'camera.front_door',
  name: 'Front Door',
  isOpen: true,
  onOpenChange: vi.fn(),
  siblingEntities: [],
  cameraViewMode: 'live' as const,
  cameraFeedMode: 'auto' as const,
  frontendStreamTypes: ['web_rtc', 'hls'] as const,
  hasMjpegStream: true,
  hasSnapshot: true,
  onCameraViewModeChange: vi.fn(),
  onCameraFeedModeChange: vi.fn(),
};

describe('CameraSettingsDialog', () => {
  it('shows only snapshot-backed camera view modes for snapshot-only cameras', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraViewMode="snapshot"
        frontendStreamTypes={[]}
        hasMjpegStream={false}
      />
    );

    const cameraViewSection = screen.getByText('Camera view').parentElement;
    expect(cameraViewSection).toBeTruthy();
    expect(
      within(cameraViewSection as HTMLElement).queryByRole('button', { name: 'Live' })
    ).not.toBeInTheDocument();
    expect(
      within(cameraViewSection as HTMLElement).getByRole('button', { name: 'Auto' })
    ).toBeInTheDocument();
    expect(
      within(cameraViewSection as HTMLElement).getByRole('button', { name: 'Snapshot' })
    ).toBeInTheDocument();

    expect(screen.queryByText('Live feed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'WebRTC' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'HLS' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MJPEG' })).not.toBeInTheDocument();
  });

  it('shows only live camera view and supported feed choices for stream-only cameras', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        frontendStreamTypes={['web_rtc']}
        hasMjpegStream={false}
        hasSnapshot={false}
      />
    );

    const cameraViewSection = screen.getByText('Camera view').parentElement;
    expect(cameraViewSection).toBeTruthy();
    expect(
      within(cameraViewSection as HTMLElement).getByRole('button', { name: 'Live' })
    ).toBeInTheDocument();
    expect(
      within(cameraViewSection as HTMLElement).queryByRole('button', { name: 'Auto' })
    ).not.toBeInTheDocument();
    expect(
      within(cameraViewSection as HTMLElement).queryByRole('button', { name: 'Snapshot' })
    ).not.toBeInTheDocument();

    const liveFeedSection = screen.getByText('Live feed').parentElement;
    expect(liveFeedSection).toBeTruthy();
    expect(
      within(liveFeedSection as HTMLElement).getByRole('button', { name: 'Auto' })
    ).toBeInTheDocument();
    expect(
      within(liveFeedSection as HTMLElement).getByRole('button', { name: 'WebRTC' })
    ).toBeInTheDocument();
    expect(
      within(liveFeedSection as HTMLElement).queryByRole('button', { name: 'HLS' })
    ).not.toBeInTheDocument();
    expect(
      within(liveFeedSection as HTMLElement).queryByRole('button', { name: 'MJPEG' })
    ).not.toBeInTheDocument();
  });
});
