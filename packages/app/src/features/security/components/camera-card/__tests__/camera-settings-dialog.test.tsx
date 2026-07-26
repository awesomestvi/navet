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
  cameraWebRtcStreamSource: 'provider' as const,
  cameraDirectStreamUrl: '',
  cameraDirectStreamUrlError: false,
  cameraFitMode: 'cover' as const,
  supportedStreamPreferences: ['web_rtc', 'mse', 'hls', 'mjpeg'] as const,
  supportsStreaming: true,
  hasSnapshot: true,
  lowPowerMode: false,
  onCameraViewModeChange: vi.fn(),
  onCameraStreamPreferenceChange: vi.fn(),
  onCameraWebRtcStreamSourceChange: vi.fn(),
  onCameraDirectStreamUrlChange: vi.fn(),
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

    const cameraViewSection = screen.getByText('Camera view').closest('.mb-6');
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

    const cameraViewSection = screen.getByText('Camera view').closest('.mb-6');
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

  it('offers MSE as a provider stream preference', () => {
    const onCameraStreamPreferenceChange = vi.fn();

    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="auto"
        onCameraStreamPreferenceChange={onCameraStreamPreferenceChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'MSE' }));

    expect(onCameraStreamPreferenceChange).toHaveBeenCalledWith('mse');
  });

  it('shows camera setting help in title info popovers instead of inline helper text', () => {
    renderWithProviders(<CameraSettingsDialog {...defaultProps} />);

    expect(
      screen.queryByText(
        'This controls the dashboard preview. Live uses Home Assistant WebRTC or HLS when available, while Snapshot keeps dashboard cards cheap to render.'
      )
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Camera view information' }));

    expect(
      screen.getByText(
        'This controls the dashboard preview. Live uses Home Assistant WebRTC or HLS when available, while Snapshot keeps dashboard cards cheap to render.'
      )
    ).toBeInTheDocument();
  });

  it('shows only supported live transport options for the camera', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        supportedStreamPreferences={['mjpeg']}
        cameraStreamPreference="mjpeg"
      />
    );

    const streamSection = screen.getByRole('button', { name: 'MJPEG' }).closest('.mb-6');
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

  it('uses one exclusive stream source toggle and reveals the direct URL conditionally', () => {
    const onCameraDirectStreamUrlChange = vi.fn();
    const onCameraWebRtcStreamSourceChange = vi.fn();

    const { rerender } = renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="provider"
        onCameraWebRtcStreamSourceChange={onCameraWebRtcStreamSourceChange}
        onCameraDirectStreamUrlChange={onCameraDirectStreamUrlChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Provider stream' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Direct stream' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const liveStreamSection = screen.getByRole('group', { name: 'Live stream' });
    expect(within(liveStreamSection).getByRole('button', { name: 'MSE' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Direct stream URL')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Direct stream' }));
    expect(onCameraWebRtcStreamSourceChange).toHaveBeenCalledWith('direct');

    rerender(
      <CameraSettingsDialog
        {...defaultProps}
        cameraWebRtcStreamSource="direct"
        onCameraWebRtcStreamSourceChange={onCameraWebRtcStreamSourceChange}
        onCameraDirectStreamUrlChange={onCameraDirectStreamUrlChange}
      />
    );

    const directLiveStreamSection = screen.getByRole('group', { name: 'Live stream' });
    expect(within(directLiveStreamSection).getByLabelText('Direct stream URL')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Direct stream URL'), {
      target: { value: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom' },
    });

    expect(onCameraDirectStreamUrlChange).toHaveBeenCalledWith(
      'http://192.168.68.71:1984/stream.html?src=camera_bedroom'
    );
  });

  it('retains a saved direct URL while provider playback is selected', () => {
    const { rerender } = renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="provider"
        cameraDirectStreamUrl="http://192.168.68.71:1984/stream.html?src=camera_bedroom"
      />
    );

    expect(screen.queryByLabelText('Direct stream URL')).not.toBeInTheDocument();

    rerender(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="direct"
        cameraDirectStreamUrl="http://192.168.68.71:1984/stream.html?src=camera_bedroom"
      />
    );

    expect(screen.getByLabelText('Direct stream URL')).toHaveValue(
      'http://192.168.68.71:1984/stream.html?src=camera_bedroom'
    );
    expect(screen.getByText('Stored only on this device.')).toBeInTheDocument();
  });

  it('does not show provider transport choices for a direct stream', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraWebRtcStreamSource="direct"
        cameraDirectStreamUrl="http://192.168.68.71:1984/stream.html?src=camera_bedroom"
      />
    );

    expect(screen.queryByRole('button', { name: 'WebRTC' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'HLS' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MJPEG' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MSE' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Auto' })).toHaveLength(1);
  });

  it('shows a direct stream URL error when the direct WebRTC URL fails', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="direct"
        cameraDirectStreamUrl="http://192.168.68.71:1984/stream.html?src=camera_bedroom"
        cameraDirectStreamUrlError
      />
    );

    const input = screen.getByLabelText('Direct stream URL');
    const error = screen.getByText(
      'Direct stream could not be used. Check the URL, HTTPS, and whether go2rtc allows this dashboard to connect.'
    );

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(error.textContent ?? '');
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

  it('hides feed sizing for cross-origin direct iframe streams', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="direct"
        cameraDirectStreamUrl="http://192.168.68.71:1984/stream.html?src=camera_bedroom"
      />
    );

    expect(screen.queryByText('Feed sizing')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cover' })).not.toBeInTheDocument();
  });

  it('keeps feed sizing available for same-origin native direct streams', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        cameraStreamPreference="web_rtc"
        cameraWebRtcStreamSource="direct"
        cameraDirectStreamUrl={`${window.location.origin}/stream.html?src=camera_bedroom`}
      />
    );

    expect(screen.getByText('Feed sizing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cover' })).toBeInTheDocument();
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
