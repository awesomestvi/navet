import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCameraGo2RtcConfig } from '@/app/stores/settings-store';
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
});
