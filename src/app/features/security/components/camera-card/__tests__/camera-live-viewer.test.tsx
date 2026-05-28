import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cameraMediaService } from '@/app/infrastructure/home-assistant/home-assistant-infrastructure';
import { cameraEntityFixtures } from '@/test/fixtures/home-assistant/entities/camera';
import { frigateFixtures } from '@/test/fixtures/home-assistant/integrations/frigate';
import { reolinkFixtures } from '@/test/fixtures/home-assistant/integrations/reolink';
import { renderWithProviders } from '@/test/render';
import { CameraLiveViewer } from '../camera-live-viewer';

vi.mock('../camera-stream-player', () => ({
  CameraStreamPlayer: ({ entityId, kind }: { entityId: string; kind: string }) => (
    <div data-testid="camera-stream-player">{`${entityId}:${kind}`}</div>
  ),
}));

vi.mock('@/app/infrastructure/home-assistant/home-assistant-infrastructure', async () => {
  const actual = await vi.importActual<
    typeof import('@/app/infrastructure/home-assistant/home-assistant-infrastructure')
  >('@/app/infrastructure/home-assistant/home-assistant-infrastructure');

  return {
    ...actual,
    cameraMediaService: {
      ...actual.cameraMediaService,
      getPlaybackPlan: vi.fn(),
    },
  };
});

const cameraMediaServiceMock = vi.mocked(cameraMediaService);

const defaultProps = {
  isOpen: true,
  onOpenChange: vi.fn(),
  entityId: cameraEntityFixtures.normal.entity_id,
  name: 'Front Door',
  room: 'Entrance',
  snapshotUrl: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
  mjpegStreamUrl: '/api/camera_proxy_stream/camera.front_door?_t=0',
  cameraViewMode: 'auto' as const,
  cameraFeedMode: 'auto' as const,
  go2RtcConfig: { serverUrl: '', streamName: 'camera.front_door' },
  isUnavailable: false,
  isRunning: true,
  isStreamCapable: true,
  frontendStreamTypes: [],
  hasGo2RtcFeed: false,
  onRefresh: vi.fn(),
  onOpenSettings: vi.fn(),
  onCameraViewModeChange: vi.fn(),
};

describe('CameraLiveViewer', () => {
  it('lets the viewer switch camera view modes', async () => {
    const onCameraViewModeChange = vi.fn();
    cameraMediaServiceMock.getPlaybackPlan.mockResolvedValue({
      primary: {
        id: 'camera.front_door:snapshot',
        kind: 'image',
        cacheKey: 'camera.front_door:snapshot',
        authStrategy: 'none',
        url: String(cameraEntityFixtures.relativeUrl.attributes.entity_picture),
      },
      fallbacks: [],
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer {...defaultProps} onCameraViewModeChange={onCameraViewModeChange} />
    );

    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }));

    expect(onCameraViewModeChange).toHaveBeenCalledWith('snapshot');
    await waitFor(() => expect(cameraMediaServiceMock.getPlaybackPlan).toHaveBeenCalled());
  });

  it('renders an unavailable fallback when Home Assistant marks the camera unavailable', async () => {
    cameraMediaServiceMock.getPlaybackPlan.mockResolvedValue({
      primary: {
        id: 'camera.front_door:unavailable',
        kind: 'unavailable',
        cacheKey: 'camera.front_door:unavailable',
        authStrategy: 'none',
      },
      fallbacks: [],
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer
        {...defaultProps}
        entityId={cameraEntityFixtures.unavailable.entity_id}
        snapshotUrl={undefined}
        mjpegStreamUrl={undefined}
        isUnavailable
        isRunning={false}
      />
    );

    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('camera-stream-player')).not.toBeInTheDocument();
  });

  it('shows snapshot fallback messaging when streaming falls back to a Home Assistant image URL', async () => {
    cameraMediaServiceMock.getPlaybackPlan.mockResolvedValue({
      primary: {
        id: 'camera.frigate_front_porch:snapshot',
        kind: 'image',
        cacheKey: 'camera.frigate_front_porch:snapshot',
        authStrategy: 'same_origin',
        url: String(frigateFixtures.camera.attributes.entity_picture),
      },
      fallbacks: [],
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer
        {...defaultProps}
        entityId={frigateFixtures.camera.entity_id}
        snapshotUrl={String(frigateFixtures.camera.attributes.entity_picture)}
        cameraViewMode="live"
      />
    );

    expect(await screen.findAllByText('Snapshot fallback')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Front Door' })).toHaveAttribute(
      'src',
      String(frigateFixtures.camera.attributes.entity_picture)
    );
  });

  it('renders the live stream player for documented HLS playback plans and wires viewer actions', async () => {
    const onRefresh = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenChange = vi.fn();

    cameraMediaServiceMock.getPlaybackPlan.mockResolvedValue({
      primary: {
        id: 'camera.reolink_driveway:hls',
        kind: 'hls_stream',
        cacheKey: 'camera.reolink_driveway:hls',
        authStrategy: 'bearer',
        url: reolinkFixtures.hlsStreamUrl,
      },
      fallbacks: [],
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraLiveViewer
        {...defaultProps}
        entityId={reolinkFixtures.camera.entity_id}
        name="Reolink Driveway"
        snapshotUrl={String(reolinkFixtures.camera.attributes.entity_picture)}
        frontendStreamTypes={['hls']}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
        onOpenChange={onOpenChange}
      />
    );

    expect(await screen.findByTestId('camera-stream-player')).toHaveTextContent(
      `${reolinkFixtures.camera.entity_id}:hls`
    );
    expect(screen.getByText('HLS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh camera snapshot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camera settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('falls back to a passive no-signal state when the entity provider does not support camera playback', async () => {
    renderWithProviders(
      <CameraLiveViewer
        {...defaultProps}
        entityId="homey:camera.front_door"
        snapshotUrl={String(cameraEntityFixtures.relativeUrl.attributes.entity_picture)}
        frontendStreamTypes={['hls']}
      />
    );

    expect(screen.queryByTestId('camera-stream-player')).not.toBeInTheDocument();
    expect(await screen.findByText('No signal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Live' })).not.toBeInTheDocument();
  });
});
