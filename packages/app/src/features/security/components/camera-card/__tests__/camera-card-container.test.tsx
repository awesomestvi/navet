import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCardContainer } from '../container';

const {
  useProviderEntityModelMock,
  useProviderCameraTopologyMock,
  useProviderCameraLiveDataMock,
  useCameraPlaybackPlanMock,
  readNavetCameraStateMock,
  cameraStreamPlayerRenderMock,
} = vi.hoisted(() => ({
  useProviderEntityModelMock: vi.fn(),
  useProviderCameraTopologyMock: vi.fn(),
  useProviderCameraLiveDataMock: vi.fn(),
  useCameraPlaybackPlanMock: vi.fn(),
  readNavetCameraStateMock: vi.fn(),
  cameraStreamPlayerRenderMock: vi.fn(),
}));

vi.mock('@navet/app/components/shared/edit-mode-settings-request', () => ({
  useEditModeSettingsRequest: vi.fn(),
}));

vi.mock('@navet/app/core/navet-device-state', () => ({
  readNavetCameraState: readNavetCameraStateMock,
}));

vi.mock('@navet/app/features/security/hooks/use-camera-playback-plan', () => ({
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
  CameraLiveViewer: () => null,
}));

vi.mock('../camera-settings-dialog', () => ({
  CameraSettingsDialog: () => null,
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
    useCameraPlaybackPlanMock
      .mockReturnValueOnce({
        cameraState: 'streaming',
        snapshotResource: {
          id: 'camera.front:snapshot',
          kind: 'image',
          cacheKey: 'camera.front:snapshot',
          authStrategy: 'same_origin',
          url: '/api/camera_proxy/camera.front',
        },
        supportsSnapshot: true,
        liveTransports: ['mjpeg'],
        fallbackTransports: [],
        selectedTransport: 'mjpeg',
        selectedStreamResource: null,
        supportsStreaming: true,
        isSnapshotFallback: false,
        shouldStartWithSnapshot: false,
        motionDetectionEnabled: null,
        refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
      })
      .mockReturnValueOnce({
        cameraState: 'streaming',
        snapshotResource: {
          id: 'camera.front:snapshot',
          kind: 'image',
          cacheKey: 'camera.front:snapshot',
          authStrategy: 'same_origin',
          url: '/api/camera_proxy/camera.front',
        },
        supportsSnapshot: true,
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
        preferredTransport: 'auto',
      })
    );
  });
});
