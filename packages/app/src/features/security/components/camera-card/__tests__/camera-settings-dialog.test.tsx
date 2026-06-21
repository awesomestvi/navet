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
  cameraStreamPreference: 'auto' as const,
  cameraFitMode: 'cover' as const,
  supportedStreamPreferences: ['web_rtc', 'hls', 'mjpeg'] as const,
  supportsStreaming: true,
  hasSnapshot: true,
  lowPowerMode: false,
  onCameraViewModeChange: vi.fn(),
  onCameraStreamPreferenceChange: vi.fn(),
  onCameraFitModeChange: vi.fn(),
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

  it('shows snapshot-backed camera view modes for snapshot-only cameras', () => {
    renderWithProviders(
      <CameraSettingsDialog {...defaultProps} cameraViewMode="snapshot" supportsStreaming={false} />
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
  });

  it('shows only live and auto for stream-only cameras', () => {
    renderWithProviders(
      <CameraSettingsDialog {...defaultProps} supportsStreaming hasSnapshot={false} />
    );

    const cameraViewSection = screen.getByText('Camera view').parentElement;
    expect(cameraViewSection).toBeTruthy();
    expect(
      within(cameraViewSection as HTMLElement).getByRole('button', { name: 'Live' })
    ).toBeInTheDocument();
    expect(
      within(cameraViewSection as HTMLElement).queryByRole('button', { name: 'Snapshot' })
    ).not.toBeInTheDocument();
  });

  it('lets users pick a preferred live transport when streaming is available', () => {
    const onCameraStreamPreferenceChange = vi.fn();

    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="auto"
        onCameraStreamPreferenceChange={onCameraStreamPreferenceChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'HLS' }));

    expect(onCameraStreamPreferenceChange).toHaveBeenCalledWith('hls');
  });

  it('shows only supported live transport options for the camera', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        supportedStreamPreferences={['mjpeg']}
        cameraStreamPreference="mjpeg"
      />
    );

    const streamSection = screen.getByText('Live stream').parentElement;
    expect(streamSection).toBeTruthy();
    expect(
      within(streamSection as HTMLElement).getByRole('button', { name: 'Auto' })
    ).toBeInTheDocument();
    expect(
      within(streamSection as HTMLElement).getByRole('button', { name: 'MJPEG' })
    ).toBeInTheDocument();
    expect(
      within(streamSection as HTMLElement).queryByRole('button', { name: 'WebRTC' })
    ).not.toBeInTheDocument();
    expect(
      within(streamSection as HTMLElement).queryByRole('button', { name: 'HLS' })
    ).not.toBeInTheDocument();
  });

  it('lets users pick how the card feed is framed', () => {
    const onCameraFitModeChange = vi.fn();

    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraFitMode="cover"
        onCameraFitModeChange={onCameraFitModeChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fit' }));

    expect(onCameraFitModeChange).toHaveBeenCalledWith('contain');
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

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    const slider = screen.getByRole('slider', { name: 'Image Brightness' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(setCameraAccessoryValueMock).toHaveBeenCalledWith('number.camera_brightness', 56)
    );
  });

  it('virtualizes dense switch accessory lists', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        siblingEntities={Array.from({ length: 20 }, (_, index) => ({
          id: `switch.camera_mode_${index}`,
          entity: {
            state: index % 2 === 0 ? 'on' : 'off',
            attributes: { friendly_name: `Camera Mode ${index}` },
          } as never,
        }))}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    const switchList = screen.getByTestId('camera-switch-list');
    expect(screen.getByRole('switch', { name: 'Camera Mode 0' })).toBeInTheDocument();
    expect(switchList).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Camera Mode 19' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(9);
  });
});
