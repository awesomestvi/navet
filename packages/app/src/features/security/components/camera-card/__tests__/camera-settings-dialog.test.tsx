import { resolveCameraGo2RtcConfig } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  cameraFeedMode: 'auto' as const,
  go2RtcConfig: { serverUrl: '', streamName: '' },
  go2RtcDefaults: { serverUrl: '', streamNamingMode: 'entity_id' as const },
  resolvedGo2RtcConfig: resolveCameraGo2RtcConfig({
    entityId: 'camera.front_door',
    defaults: { serverUrl: '', streamNamingMode: 'entity_id' },
    override: { serverUrl: '', streamName: '' },
    canUseEmbeddedPanel: false,
  }),
  frontendStreamTypes: ['web_rtc', 'hls'] as const,
  hasGo2RtcFeed: false,
  hasMjpegStream: true,
  hasSnapshot: true,
  lowPowerMode: false,
  onCameraViewModeChange: vi.fn(),
  onCameraFeedModeChange: vi.fn(),
  onGo2RtcDefaultsChange: vi.fn(),
  onGo2RtcConfigChange: vi.fn(),
};

afterEach(() => {
  window.__NAVET_PANEL__ = undefined;
});

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

  it('shows go2rtc as a live feed choice only when go2rtc is available', () => {
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        frontendStreamTypes={[]}
        hasGo2RtcFeed
        hasMjpegStream={false}
      />
    );

    const liveFeedSection = screen.getByText('Live feed').parentElement;
    expect(liveFeedSection).toBeTruthy();
    expect(
      within(liveFeedSection as HTMLElement).getByRole('button', { name: 'go2rtc' })
    ).toBeInTheDocument();
    expect(
      within(liveFeedSection as HTMLElement).queryByRole('button', { name: 'WebRTC' })
    ).not.toBeInTheDocument();
  });

  it('edits direct go2rtc server and stream settings', () => {
    const onGo2RtcConfigChange = vi.fn();
    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        go2RtcDefaults={{
          serverUrl: 'http://homeassistant.local:11984',
          streamNamingMode: 'entity_id',
        }}
        resolvedGo2RtcConfig={resolveCameraGo2RtcConfig({
          entityId: 'camera.front_door',
          defaults: {
            serverUrl: 'http://homeassistant.local:11984',
            streamNamingMode: 'entity_id',
          },
          override: { serverUrl: '', streamName: '' },
          canUseEmbeddedPanel: false,
        })}
        onGo2RtcConfigChange={onGo2RtcConfigChange}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'go2rtc' })[0]);

    fireEvent.change(screen.getByLabelText('Server URL'), {
      target: { value: 'http://go2rtc.local:1984' },
    });
    fireEvent.change(screen.getByLabelText('Stream name'), {
      target: { value: 'front_door' },
    });

    expect(onGo2RtcConfigChange).toHaveBeenCalledWith({
      serverUrl: 'http://go2rtc.local:1984',
      streamName: '',
    });
    expect(onGo2RtcConfigChange).toHaveBeenCalledWith({
      serverUrl: '',
      streamName: 'front_door',
    });
  });

  it('shows the embedded panel go2rtc strategy for Home Assistant custom panel users', () => {
    window.__NAVET_PANEL__ = true;

    renderWithProviders(
      <CameraSettingsDialog
        {...defaultProps}
        hasGo2RtcFeed
        resolvedGo2RtcConfig={resolveCameraGo2RtcConfig({
          entityId: 'camera.front_door',
          defaults: { serverUrl: '', streamNamingMode: 'entity_id' },
          override: { serverUrl: '', streamName: '' },
          canUseEmbeddedPanel: true,
        })}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'go2rtc' })[0]);

    expect(screen.getByText('Embedded Home Assistant go2rtc')).toBeInTheDocument();
    expect(screen.getByLabelText('Default server URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Server URL')).toBeInTheDocument();
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
