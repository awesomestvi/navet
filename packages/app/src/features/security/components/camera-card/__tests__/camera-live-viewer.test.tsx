import { cameraEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/camera';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraLiveViewer } from '../camera-live-viewer';

const { getCameraPlaybackPlanMock } = vi.hoisted(() => ({
  getCameraPlaybackPlanMock: vi.fn(),
}));

vi.mock('../camera-stream-player', () => ({
  CameraStreamPlayer: ({
    entityId,
    kind,
    fitMode,
  }: {
    entityId: string;
    kind: string;
    fitMode: string;
  }) => (
    <div data-testid="camera-stream-player" data-fit-mode={fitMode}>{`${entityId}:${kind}`}</div>
  ),
}));

vi.mock('@navet/app/services/integration-camera-runtime.service', () => ({
  getCameraPlaybackPlan: getCameraPlaybackPlanMock,
}));

const defaultProps = {
  isOpen: true,
  onOpenChange: vi.fn(),
  entityId: 'home_assistant:camera.front_door',
  name: 'Front Door',
  room: 'Entrance',
  cameraState: 'streaming' as const,
  snapshotUrl: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
  cameraViewMode: 'auto' as const,
  preferredTransport: 'auto' as const,
  isStreamCapable: true,
  motionDetectionEnabled: true,
  initialStreamResource: null,
  onRefresh: vi.fn(),
  onOpenSettings: vi.fn(),
  onCameraViewModeChange: vi.fn(),
};

describe('CameraLiveViewer', () => {
  it('lets the viewer switch camera view modes', async () => {
    const onCameraViewModeChange = vi.fn();
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'none',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: 'web_rtc',
      selectedStreamResource: null,
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: true,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer {...defaultProps} onCameraViewModeChange={onCameraViewModeChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }));

    expect(onCameraViewModeChange).toHaveBeenCalledWith('snapshot');
    await waitFor(() => expect(getCameraPlaybackPlanMock).toHaveBeenCalled());
  });

  it('keeps the live mode pill visible while snapshot mode is selected on stream-capable cameras', async () => {
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'none',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: false,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: true,
      motionDetectionEnabled: true,
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(<CameraLiveViewer {...defaultProps} cameraViewMode="snapshot" />);

    expect(await screen.findByRole('button', { name: 'Live' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Snapshot' })).toBeInTheDocument();
  });

  it('renders an unavailable fallback when the camera is unavailable', async () => {
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'unavailable',
      snapshotResource: null,
      supportsSnapshot: false,
      liveTransports: [],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: false,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: null,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer {...defaultProps} cameraState="unavailable" snapshotUrl={undefined} />
    );

    expect(await screen.findAllByText('Unavailable')).toHaveLength(2);
    expect(screen.queryByTestId('camera-stream-player')).not.toBeInTheDocument();
  });

  it('shows snapshot fallback messaging when streaming falls back to a still image', async () => {
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'same_origin',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: [],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: false,
      isSnapshotFallback: true,
      shouldStartWithSnapshot: true,
      motionDetectionEnabled: true,
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(<CameraLiveViewer {...defaultProps} cameraViewMode="live" />);

    expect(await screen.findAllByText('Snapshot fallback')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      String(cameraEntityFixtures.relativeUrl.attributes.entity_picture)
    );
  });

  it('renders the live stream player for Home Assistant native playback and wires viewer actions', async () => {
    const onRefresh = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenChange = vi.fn();

    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'bearer',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: ['hls'],
      fallbackTransports: [],
      selectedTransport: 'hls',
      selectedStreamResource: {
        id: 'camera.front_door:hls',
        kind: 'hls_stream',
        cacheKey: 'camera.front_door:hls',
        authStrategy: 'bearer',
        url: '/api/hls/camera.front_door/master.m3u8',
      },
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: true,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer
        {...defaultProps}
        initialStreamResource={{
          id: 'camera.front_door:hls',
          kind: 'hls_stream',
          cacheKey: 'camera.front_door:hls',
          authStrategy: 'bearer',
          url: '/api/hls/camera.front_door/master.m3u8',
        }}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
        onOpenChange={onOpenChange}
      />
    );

    expect(await screen.findByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.front_door:hls'
    );
    expect(screen.getByTestId('camera-stream-player')).toHaveAttribute('data-fit-mode', 'contain');
    expect(screen.getByText('HLS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh camera snapshot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camera settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('treats an active selected stream as live even when the camera state is idle', async () => {
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'idle',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'bearer',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: 'web_rtc',
      selectedStreamResource: null,
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: true,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(<CameraLiveViewer {...defaultProps} cameraState="idle" />);

    expect(await screen.findByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.front_door:web_rtc'
    );
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('passes the selected feed sizing mode to the fullscreen stream player', async () => {
    getCameraPlaybackPlanMock.mockResolvedValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'bearer',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      supportsSnapshot: true,
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: 'web_rtc',
      selectedStreamResource: {
        id: 'camera.front_door:direct',
        kind: 'webrtc_stream',
        cacheKey: 'camera.front_door:direct',
        authStrategy: 'none',
        url: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
      },
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: true,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(<CameraLiveViewer {...defaultProps} cameraFitMode="cover" />);

    expect(await screen.findByTestId('camera-stream-player')).toHaveAttribute(
      'data-fit-mode',
      'cover'
    );
  });
});
