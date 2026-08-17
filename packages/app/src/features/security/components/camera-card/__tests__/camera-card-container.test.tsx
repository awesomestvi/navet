import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAMERA_STREAM_OFFSCREEN_GRACE_MS,
  resetCameraLiveStreamBudgetForTests,
} from '../camera-live-stream-budget';
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

vi.mock('../camera-live-viewer', async () => {
  const { CameraStreamHostSlot } = await vi.importActual<
    typeof import('../camera-stream-host-slot')
  >('../camera-stream-host-slot');
  return {
    CameraLiveViewer: (props: {
      preferredTransport: string;
      retainedStreamHost?: HTMLDivElement | null;
    }) => {
      cameraLiveViewerRenderMock(props);
      return (
        <div data-testid="camera-live-viewer">
          {props.retainedStreamHost ? (
            <CameraStreamHostSlot host={props.retainedStreamHost} />
          ) : null}
        </div>
      );
    },
  };
});

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
  static instances: MockIntersectionObserver[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(_target: Element) {
    this.emit(false);
  }

  disconnect() {}

  unobserve() {}

  takeRecords() {
    return [];
  }

  emit(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

describe('CameraCardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
    resetCameraLiveStreamBudgetForTests();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    useSettingsStore.setState({
      cameraViewModes: {},
      cameraStreamPreferences: {},
      cameraWebRtcStreamSources: {},
      cameraDirectStreamUrls: {},
      disableAnimations: false,
      effectsQuality: 'high',
      lowPowerMode: false,
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
    vi.useRealTimers();
    resetCameraLiveStreamBudgetForTests();
    vi.unstubAllGlobals();
  });

  it('releases a live stream after an offscreen grace period', () => {
    vi.useFakeTimers();
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

    expect(screen.queryByTestId('camera-stream-player')).not.toBeInTheDocument();

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(true);
    });
    expect(screen.getByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.front:web_rtc'
    );

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(false);
    });
    expect(screen.getByTestId('camera-stream-player')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(CAMERA_STREAM_OFFSCREEN_GRACE_MS);
    });
    expect(screen.queryByTestId('camera-stream-player')).not.toBeInTheDocument();
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

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(true);
    });
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

  it('moves the single low-power live-stream slot to the visible camera', () => {
    useSettingsStore.setState({
      effectsQuality: 'low',
      lowPowerMode: true,
    });
    useSettingsStore.getState().updateCameraViewMode('home_assistant:camera.front', 'live');
    useSettingsStore.getState().updateCameraViewMode('home_assistant:camera.garden', 'live');

    renderWithProviders(
      <>
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
        <CameraCardContainer
          id="home_assistant:camera.garden"
          name="Garden"
          room="Outside"
          entityPicture="/api/camera_proxy/camera.garden"
          isStreamCapable
          size="large"
          onSizeChange={vi.fn()}
          isEditMode={false}
        />
      </>
    );

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(true);
      MockIntersectionObserver.instances[1]?.emit(true);
    });

    expect(screen.getAllByTestId('camera-stream-player')).toHaveLength(1);
    expect(screen.getByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.front:web_rtc'
    );

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(false);
    });

    expect(screen.getAllByTestId('camera-stream-player')).toHaveLength(1);
    expect(screen.getByTestId('camera-stream-player')).toHaveTextContent(
      'home_assistant:camera.garden:web_rtc'
    );
  });

  it('moves the same live stream into the fullscreen viewer without remounting it', () => {
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

    act(() => {
      MockIntersectionObserver.instances[0]?.emit(true);
    });
    const streamPlayer = screen.getByTestId('camera-stream-player');

    fireEvent.click(screen.getByRole('button', { name: 'Open camera viewer: Front Door' }));

    expect(screen.getByTestId('camera-live-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('camera-stream-player')).toBe(streamPlayer);
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

  it('lets an explicit per-camera live choice bypass the low-power snapshot fallback', () => {
    useSettingsStore.getState().updateSettings({
      effectsQuality: 'low',
      lowPowerMode: true,
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
        preferredMode: 'snapshot',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Camera settings' }));
    expect(cameraSettingsDialogRenderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cameraViewMode: 'snapshot',
      })
    );

    act(() => {
      useSettingsStore.getState().updateCameraViewMode('home_assistant:camera.front', 'live');
    });

    expect(useCameraPlaybackPlanMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        preferredMode: 'live',
      })
    );
    expect(cameraSettingsDialogRenderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cameraViewMode: 'live',
      })
    );
  });
});
