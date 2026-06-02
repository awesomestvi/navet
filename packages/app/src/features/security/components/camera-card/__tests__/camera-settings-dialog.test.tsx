import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraSettingsDialog } from '../camera-settings-dialog';

const { selectCameraAccessoryOptionMock, setCameraAccessoryValueMock, toggleCameraAccessoryMock } =
  vi.hoisted(() => ({
    selectCameraAccessoryOptionMock: vi.fn().mockResolvedValue(undefined),
    setCameraAccessoryValueMock: vi.fn().mockResolvedValue(undefined),
    toggleCameraAccessoryMock: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@navet/app/services/integration-camera-feature.service', () => ({
  integrationCameraFeatureService: {
    selectCameraAccessoryOption: selectCameraAccessoryOptionMock,
    setCameraAccessoryValue: setCameraAccessoryValueMock,
    toggleCameraAccessory: toggleCameraAccessoryMock,
    enableCameraMotionDetection: vi.fn(),
    disableCameraMotionDetection: vi.fn(),
    refreshCameraSnapshot: vi.fn(),
    getCameraCapabilities: vi.fn(),
    getCameraStreamUrl: vi.fn(),
    getWebRtcClientConfiguration: vi.fn(),
    subscribeCameraWebRtcOffer: vi.fn(),
    addCameraWebRtcCandidate: vi.fn(),
  },
}));

const defaultProps = {
  entityId: 'camera.front_door',
  name: 'Front Door',
  isOpen: true,
  onOpenChange: vi.fn(),
  siblingEntities: [],
  cameraViewMode: 'live' as const,
  frontendStreamTypes: ['web_rtc', 'hls'] as const,
  hasGo2RtcFeed: false,
  hasMjpegStream: true,
  hasSnapshot: true,
  lowPowerMode: false,
  onCameraViewModeChange: vi.fn(),
};

describe('CameraSettingsDialog', () => {
  beforeEach(() => {
    selectCameraAccessoryOptionMock.mockReset();
    selectCameraAccessoryOptionMock.mockResolvedValue(undefined);
    setCameraAccessoryValueMock.mockReset();
    setCameraAccessoryValueMock.mockResolvedValue(undefined);
    toggleCameraAccessoryMock.mockReset();
    toggleCameraAccessoryMock.mockResolvedValue(undefined);
  });

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

  it('shows only the supported camera view options for stream-only cameras', () => {
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
  });

  it('does not show live feed transport controls even when go2rtc is available', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        frontendStreamTypes={[]}
        hasGo2RtcFeed
        hasMjpegStream={false}
      />
    );

    expect(screen.queryByText('Live feed')).not.toBeInTheDocument();
    expect(screen.queryByText('go2rtc')).not.toBeInTheDocument();
  });

  it('routes sibling switch and select controls through the camera provider service', async () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        siblingEntities={[
          {
            id: 'switch.camera_motion_detection',
            entity: {
              state: 'on',
              attributes: { friendly_name: 'Motion Detection' },
            } as never,
          },
          {
            id: 'select.camera_ir_mode',
            entity: {
              state: 'auto',
              attributes: { friendly_name: 'IR Mode', options: ['off', 'auto', 'on'] },
            } as never,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Motion Detection' }));
    await waitFor(() =>
      expect(toggleCameraAccessoryMock).toHaveBeenCalledWith(
        'switch.camera_motion_detection',
        'off'
      )
    );

    fireEvent.change(screen.getByLabelText('IR Mode'), { target: { value: 'on' } });
    await waitFor(() =>
      expect(selectCameraAccessoryOptionMock).toHaveBeenCalledWith('select.camera_ir_mode', 'on')
    );
  });

  it('routes sibling number controls through the camera provider service', async () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        siblingEntities={[
          {
            id: 'number.camera_brightness',
            entity: {
              state: '55',
              attributes: { friendly_name: 'Image Brightness', min: 0, max: 100, step: 1 },
            } as never,
          },
        ]}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Image Brightness' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(setCameraAccessoryValueMock).toHaveBeenCalledWith('number.camera_brightness', 56)
    );
  });
});
