import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCardContainer } from '../container';

const {
  useProviderEntityModelMock,
  useProviderCameraTopologyMock,
  useProviderCameraLiveDataMock,
  useCameraPlaybackPlanMock,
  readNavetCameraStateMock,
  cameraStreamPlayerRenderMock,
  cameraLiveViewerRenderMock,
  cameraSettingsDialogRenderMock,
} = vi.hoisted(() => ({
  useProviderEntityModelMock: vi.fn(),
  useProviderCameraTopologyMock: vi.fn(),
  useProviderCameraLiveDataMock: vi.fn(),
  useCameraPlaybackPlanMock: vi.fn(),
  readNavetCameraStateMock: vi.fn(),
  cameraStreamPlayerRenderMock: vi.fn(),
  cameraLiveViewerRenderMock: vi.fn(),
  cameraSettingsDialogRenderMock: vi.fn(),
}));

vi.mock('@navet/app/components/shared/edit-mode-settings-request', () => ({
  useEditModeSettingsRequest: vi.fn(),
}));

vi.mock('@navet/app/core/navet-device-state', () => ({
  readNavetCameraState: readNavetCameraStateMock,
}));

vi.mock('@navet/app/features/security/hooks/use-camera-playback-plan', () => ({
  normalizeCameraDirectStreamUrl: (value: string | undefined) => value ?? null,
  useCameraPlaybackPlan: useCameraPlaybackPlanMock,
}));

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<typeof import('@navet/app/hooks')>('@navet/app/hooks');
  return {
    ...actual,
    useProviderCameraTopology: useProviderCameraTopologyMock,
  };
});

vi.mock('@navet/app/hooks/use-provider-device', () => ({
  useProviderEntityModel: useProviderEntityModelMock,
}));

vi.mock('@navet/app/services/integration-camera-feature.service', () => ({
  integrationCameraFeatureService: {
    refreshCameraSnapshot: vi.fn(),
    enableCameraMotionDetection: vi.fn(),
    disableCameraMotionDetection: vi.fn(),
  },
}));

vi.mock('@navet/app/services/integration-resource.service', () => ({
  normalizeResourceUrl: (url: string) => url,
}));

vi.mock('../camera-live-viewer', () => ({
  CameraLiveViewer: (props: { preferredTransport: string }) => {
    cameraLiveViewerRenderMock(props);
    return <div data-testid="camera-live-viewer" />;
  },
}));

vi.mock('../camera-settings-dialog', () => ({
  CameraSettingsDialog: (props: {
    cameraStreamPreference: string;
    supportedStreamPreferences: string[];
  }) => {
    cameraSettingsDialogRenderMock(props);
    return <div data-testid="camera-settings-dialog" />;
  },
}));

vi.mock('../camera-stream-player', () => ({
  CameraStreamPlayer: ({ entityId, kind }: { entityId: string; kind: 'hls' | 'web_rtc' }) => {
    cameraStreamPlayerRenderMock(`${entityId}:${kind}`);
    return <div data-testid="camera-stream-player">{`${entityId}:${kind}`}</div>;
  },
}));

vi.mock('../use-provider-camera-live-data', () => ({
  useProviderCameraLiveData: useProviderCameraLiveDataMock,
}));

class MockIntersectionObserver {
  constructor(
    private readonly callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {}

  observe(_target: Element) {
    this.callback([{ isIntersecting: false } as IntersectionObserverEntry], this as never);
  }

  disconnect() {}

  unobserve() {}

  takeRecords() {
    return [];
  }
}

describe('CameraCardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    useSettingsStore.setState({
      cameraStreamPreferences: {},
      cameraWebRtcStreamSources: {},
      cameraDirectStreamUrls: {},
    });

    useProviderEntityModelMock.mockReturnValue({
      providerId: 'home_assistant',
    });
    useProviderCameraTopologyMock.mockReturnValue({
      siblingIds: [],
    });
    useProviderCameraLiveDataMock.mockReturnValue({
      cameraState: 'streaming',
      companionStates: [],
      connected: true,
      deviceEntities: {},
      liveEntity: {
        state: 'streaming',
        attributes: {
          entity_picture: '/api/camera_proxy/camera.front',
        },
      },
      liveState: {
        isStreamCapable: true,
        isStillImageOnly: false,
        motionDetectionEnabled: null,
      },
    });
    readNavetCameraStateMock.mockReturnValue({
      isStreamCapable: true,
    });
    useCameraPlaybackPlanMock.mockReturnValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front:snapshot',
        kind: 'image',
        cacheKey: 'camera.front:snapshot',
        authStrategy: 'same_origin',
        url: '/api/camera_proxy/camera.front',
      },
      supportsSnapshot: true,
      supportedTransports: ['web_rtc'],
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: 'web_rtc',
      selectedStreamResource: null,
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: null,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the live stream player mounted even when intersection visibility is false', () => {
    renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.front:web_rtc'
    );
  });

  it('does not start the shared camera clock interval when the card is hidden', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 30_000);
  });

  it('does not recreate the live stream subtree when the card rerenders for non-stream changes', () => {
    const onSizeChange = vi.fn();
    const { rerender } = renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={onSizeChange}
        isEditMode={false}
      />
    );

    expect(cameraStreamPlayerRenderMock).toHaveBeenCalledTimes(1);

    useProviderCameraLiveDataMock.mockReturnValue({
      cameraState: 'streaming',
      companionStates: [
        {
          entityId: 'binary_sensor.front_motion',
          type: 'motion',
          detected: true,
          changedAt: '2026-06-04T00:00:00.000Z',
        },
      ],
      connected: true,
      deviceEntities: {},
      liveEntity: {
        state: 'streaming',
        attributes: {
          entity_picture: '/api/camera_proxy/camera.front',
        },
      },
      liveState: {
        isStreamCapable: true,
        isStillImageOnly: false,
        motionDetectionEnabled: null,
      },
    });

    rerender(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={onSizeChange}
        isEditMode={false}
      />
    );

    expect(cameraStreamPlayerRenderMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes an unsupported saved stream preference back to auto for playback planning', () => {
    useSettingsStore
      .getState()
      .updateCameraStreamPreference('home_assistant:camera.front', 'web_rtc');
    useCameraPlaybackPlanMock.mockReturnValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front:snapshot',
        kind: 'image',
        cacheKey: 'camera.front:snapshot',
        authStrategy: 'same_origin',
        url: '/api/camera_proxy/camera.front',
      },
      supportsSnapshot: true,
      supportedTransports: ['mjpeg'],
      liveTransports: ['mjpeg'],
      fallbackTransports: [],
      selectedTransport: 'mjpeg',
      selectedStreamResource: null,
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: null,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(useCameraPlaybackPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredTransport: 'web_rtc',
      })
    );
    expect(useCameraPlaybackPlanMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        preferredTransport: 'auto',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Camera settings' }));

    expect(screen.getByTestId('camera-settings-dialog')).toBeInTheDocument();
    expect(cameraSettingsDialogRenderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cameraStreamPreference: 'auto',
        supportedStreamPreferences: ['mjpeg'],
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open camera viewer: Front Door' }));

    expect(screen.getByTestId('camera-live-viewer')).toBeInTheDocument();
    expect(cameraLiveViewerRenderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        preferredTransport: 'auto',
      })
    );
  });

  it('uses one direct-source playback plan instead of mounting a provider options plan', () => {
    useSettingsStore
      .getState()
      .updateCameraWebRtcStreamSource('home_assistant:camera.front', 'direct');
    useSettingsStore
      .getState()
      .updateCameraDirectStreamUrl(
        'home_assistant:camera.front',
        'http://go2rtc.local:1984/stream.html?src=front'
      );
    useCameraPlaybackPlanMock.mockClear();

    renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(useCameraPlaybackPlanMock).toHaveBeenCalled();
    expect(
      useCameraPlaybackPlanMock.mock.calls.every(
        ([request]) => request.webRtcStreamSource === 'direct'
      )
    ).toBe(true);
  });

  it('keeps live playback planning exempt from performance-profile effect downgrades', () => {
    useSettingsStore.getState().updateSettings({
      disableAnimations: true,
      effectsQuality: 'high',
      lowPowerMode: false,
    });

    renderWithProviders(
      <CameraCardContainer
        id="home_assistant:camera.front"
        name="Front Door"
        room="Entrance"
        entityPicture="/api/camera_proxy/camera.front"
        isStreamCapable
        size="large"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(useCameraPlaybackPlanMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        preferredMode: 'live',
      })
    );
  });
});
