import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { renderWithProviders } from '@navet/app/test/render';
import type {
  CameraDevice,
  LockDevice,
  PersonDevice,
  SecurityKind,
  SecuritySeverity,
  SensorDevice,
} from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildSecurityCameraDashboardModel } from '../../utils/security-camera-dashboard-model';
import { SecurityCameraDashboard } from '../security-camera-dashboard';

vi.mock('@navet/app/features/dashboard', () => ({
  DashboardCardItem: ({ device }: { device: { id: string; name: string } }) => (
    <div data-testid={`detail-card:${device.id}`}>{device.name}</div>
  ),
  DashboardEditActions: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@navet/app/hooks/use-breakpoint-cols', () => ({
  useBreakpointCols: () => 4,
}));

vi.mock('../camera-card/camera-live-viewer', () => ({
  CameraLiveViewer: ({ isOpen, name }: { isOpen: boolean; name: string }) =>
    isOpen ? <div>Viewer:{name}</div> : null,
}));

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useProviderCameraTopology: () => ({ siblingIds: [] }),
  };
});

vi.mock('@navet/app/hooks/use-provider-device', () => ({
  useProviderEntityModel: () => null,
}));

vi.mock('../../hooks/use-camera-playback-plan', () => ({
  useCameraPlaybackPlan: () => ({
    selectedStreamResource: null,
  }),
}));

vi.mock('../camera-card/use-provider-camera-live-data', () => ({
  useProviderCameraLiveData: () => ({
    cameraState: 'streaming',
    liveEntity: null,
    liveState: {
      isStreamCapable: true,
      motionDetectionEnabled: null,
    },
  }),
}));

vi.mock('@navet/app/stores/settings-store', async () => {
  const actual = await vi.importActual<object>('@navet/app/stores/settings-store');
  return {
    ...actual,
    useSettingsStore: (
      selector: (state: {
        cameraStreamPreferences: Record<string, 'auto'>;
        cameraStreamPreference: 'auto';
      }) => unknown
    ) => selector({ cameraStreamPreferences: {}, cameraStreamPreference: 'auto' }),
  };
});

vi.mock('@navet/app/services/integration-camera-feature.service', () => ({
  integrationCameraFeatureService: {
    refreshCameraSnapshot: vi.fn(),
  },
}));

function camera(
  overrides: Partial<CameraDevice> &
    Pick<CameraDevice, 'id' | 'name'> & {
      securitySeverity?: SecuritySeverity;
    }
): CameraDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Outside',
    size: overrides.size ?? 'medium',
    providerId: overrides.providerId ?? 'home_assistant',
    sourceDeviceId: overrides.sourceDeviceId,
    state: overrides.state ?? 'idle',
    supportedFeatures: overrides.supportedFeatures ?? 0,
    isStreamCapable: overrides.isStreamCapable ?? false,
    isStillImageOnly: overrides.isStillImageOnly ?? false,
    entityPicture: overrides.entityPicture,
    securityKind: 'camera',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

function lock(
  overrides: Partial<LockDevice> &
    Pick<LockDevice, 'id' | 'name'> & {
      securitySeverity?: SecuritySeverity;
    }
): LockDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'small',
    state: overrides.state ?? true,
    securityKind: 'lock',
    securitySeverity:
      overrides.securitySeverity ?? (overrides.state === false ? 'warning' : 'normal'),
  };
}

function sensor(
  overrides: Partial<SensorDevice> &
    Pick<SensorDevice, 'id' | 'name'> & {
      securityKind: SecurityKind;
      securitySeverity?: SecuritySeverity;
    }
): SensorDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'small',
    value: overrides.value ?? 'Detected',
    unit: overrides.unit ?? '',
    status: overrides.status ?? 'active',
    securityKind: overrides.securityKind,
    securitySeverity: overrides.securitySeverity ?? 'active',
    sourceDeviceId: overrides.sourceDeviceId,
  };
}

function person(
  overrides: Partial<PersonDevice> & Pick<PersonDevice, 'id' | 'name'>
): PersonDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Home',
    size: overrides.size ?? 'small',
    location: overrides.location ?? 'Away',
    state: overrides.state ?? 'away',
    entityPicture: overrides.entityPicture,
    securityKind: overrides.securityKind ?? 'person',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

function renderDashboard() {
  const model = buildSecurityCameraDashboardModel({
    cameras: [
      camera({
        id: 'camera.garage',
        name: 'Garage Camera',
        room: 'Garage',
        securitySeverity: 'normal',
      }),
    ],
    locks: [lock({ id: 'lock.front', name: 'Front Door', state: false })],
    sensors: [
      sensor({
        id: 'binary_sensor.smoke',
        name: 'Kitchen Smoke',
        room: 'Kitchen',
        securityKind: 'smoke',
        securitySeverity: 'critical',
        value: 'Smoke detected',
      }),
      sensor({
        id: 'binary_sensor.entry_motion',
        name: 'Entry Motion',
        room: 'Entrance',
        securityKind: 'motion',
        securitySeverity: 'active',
        value: 'Motion detected',
      }),
      sensor({
        id: 'binary_sensor.side_door',
        name: 'Side Door',
        room: 'Side Entry',
        securityKind: 'door',
        securitySeverity: 'unknown',
        status: 'unavailable',
        value: 'Unavailable',
      }),
    ],
  });

  return renderWithProviders(
    <SecurityCameraDashboard
      model={model}
      isEditMode={false}
      cardSizes={{}}
      updateCardSize={vi.fn()}
      surface={getThemeSurfaceTokens('glass')}
    />
  );
}

describe('SecurityCameraDashboard', () => {
  it('renders the summary and top-priority sections before details', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Critical alert' })).toBeInTheDocument();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attention' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live' })).toBeInTheDocument();
    expect(screen.getByText('All Security')).toBeInTheDocument();

    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings.indexOf('Now')).toBeLessThan(headings.indexOf('All Security'));

    expect(screen.getAllByText('Kitchen Smoke').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entry Motion').length).toBeGreaterThan(0);
    expect(screen.queryByText('Secure')).not.toBeInTheDocument();
    expect(screen.queryByText(/secure$/i)).not.toBeInTheDocument();
  });

  it('keeps the hero attention count aligned with visible attention items', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: false })],
      sensors: [
        sensor({
          id: 'binary_sensor.smoke',
          name: 'Kitchen Smoke',
          room: 'Kitchen',
          securityKind: 'smoke',
          securitySeverity: 'critical',
          value: 'Smoke detected',
        }),
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          room: 'Side Entry',
          securityKind: 'door',
          securitySeverity: 'unknown',
          status: 'unavailable',
          value: 'Unavailable',
        }),
      ],
      persons: [
        person({
          id: 'person.vishal',
          name: 'Vishal',
          state: 'away',
          location: 'Away',
          securitySeverity: 'unknown',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    expect(screen.getByText('3 to check')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Kitchen Smoke|Front Door|Side Door/i })
    ).toHaveLength(3);
  });

  it('keeps the now section focused on problems when there is no active item', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: false })],
      sensors: [
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          securityKind: 'door',
          securitySeverity: 'warning',
          value: 'Open',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('No live activity.')).toBeInTheDocument();
    expect(screen.queryByText('Entry Motion')).not.toBeInTheDocument();
    expect(screen.queryByText('Secure')).not.toBeInTheDocument();
  });

  it('shows the secure section only when there are no attention items', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.garage',
          name: 'Garage Camera',
          room: 'Garage',
          securitySeverity: 'normal',
        }),
      ],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: true })],
      sensors: [
        sensor({
          id: 'binary_sensor.entry_motion',
          name: 'Entry Motion',
          room: 'Entrance',
          securityKind: 'motion',
          securitySeverity: 'active',
          value: 'Motion detected',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    expect(screen.getByText('Secure')).toBeInTheDocument();
    expect(screen.getByText('1 locks locked')).toBeInTheDocument();
  });

  it('uses severity-weighted pulse markers only for critical and warning rows', () => {
    const { container } = renderDashboard();

    const pulseMarkers = container.querySelectorAll(
      '[class*="navet-security-critical-pulse"], [class*="navet-security-warning-pulse"]'
    );

    expect(pulseMarkers.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Kitchen Smoke/i }).innerHTML).toContain(
      'navet-security-critical-pulse'
    );
    expect(screen.getByRole('button', { name: /Front Door/i }).innerHTML).toContain(
      'navet-security-warning-pulse'
    );
    expect(screen.getByRole('button', { name: /Entry Motion/i }).innerHTML).not.toContain(
      'navet-security-critical-pulse'
    );
    expect(screen.getByRole('button', { name: /Entry Motion/i }).innerHTML).not.toContain(
      'navet-security-warning-pulse'
    );
    expect(screen.getByRole('button', { name: /Side Door/i }).innerHTML).not.toContain(
      'navet-security-critical-pulse'
    );
    expect(screen.getByRole('button', { name: /Side Door/i }).innerHTML).not.toContain(
      'navet-security-warning-pulse'
    );
  });

  it('shows device status instead of generic severity label in the attention lane', () => {
    renderDashboard();

    const attentionRow = screen.getByRole('button', { name: /Kitchen Smoke/i });
    const unlockedLockRow = screen.getByRole('button', { name: /Front Door/i });
    const openingRow = screen.getByRole('button', { name: /Side Door/i });

    expect(attentionRow).toHaveTextContent('Smoke detected');
    expect(attentionRow).not.toHaveTextContent('Critical');
    expect(attentionRow.innerHTML).toContain('text-rose-300');
    expect(unlockedLockRow).toHaveTextContent('Unlocked');
    expect(unlockedLockRow.innerHTML).toContain('text-red-300');
    expect(unlockedLockRow.innerHTML).toContain('bg-red-400');
    expect(openingRow).toHaveTextContent('Unavailable');
    expect(openingRow).not.toHaveTextContent('Active');
  });

  it('matches critical siren status text color to its alert dot color', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [],
      sensors: [
        sensor({
          id: 'siren.garage',
          name: 'Garage Siren',
          room: 'Garage',
          securityKind: 'siren',
          securitySeverity: 'critical',
          value: 'On',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const sirenRow = screen.getByRole('button', { name: /Garage Siren/i });

    expect(sirenRow).toHaveTextContent('On');
    expect(sirenRow.innerHTML).toContain('text-red-400');
    expect(sirenRow.innerHTML).toContain('bg-red-500');
  });

  it('shows detail groups as tabs and defaults to the first problem group', () => {
    renderDashboard();

    const locksTab = screen.getByRole('tab', { name: /Locks/i });
    const camerasTab = screen.getByRole('tab', { name: /Cameras/i });
    const motionTab = screen.getByRole('tab', { name: /Motion & occupancy/i });

    expect(locksTab).toHaveAttribute('aria-selected', 'true');
    expect(camerasTab).toHaveAttribute('aria-selected', 'false');
    expect(locksTab.innerHTML).toContain('bg-red-400');
    expect(motionTab.innerHTML).toContain('bg-amber-');
    expect(screen.getByTestId('detail-card:lock.front')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-card:camera.garage')).not.toBeInTheDocument();

    fireEvent.click(camerasTab);

    expect(camerasTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('detail-card:camera.garage')).toBeInTheDocument();
  });

  it('allows top-level sections to collapse and expand', () => {
    renderDashboard();

    const detailsToggle = screen.getByRole('button', { name: /All Security/i });

    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tab', { name: /Locks/i })).toBeInTheDocument();

    fireEvent.click(detailsToggle);

    expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tab', { name: /Locks/i })).not.toBeInTheDocument();

    fireEvent.click(detailsToggle);

    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tab', { name: /Locks/i })).toBeInTheDocument();
  });

  it('uses the richer red badge tint for critical siren detail tabs', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [],
      sensors: [
        sensor({
          id: 'siren.garage',
          name: 'Garage Siren',
          room: 'Garage',
          securityKind: 'siren',
          securitySeverity: 'critical',
          value: 'Sounding',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const sirensTab = screen.getByRole('tab', { name: /Sirens/i });

    expect(sirensTab.innerHTML).toContain('bg-red-');
  });

  it('uses a neutral grey detail dot for cameras when availability is unknown', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway Camera',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          securitySeverity: 'active',
        }),
        camera({
          id: 'camera.garage',
          name: 'Garage Camera',
          room: 'Garage',
          securitySeverity: 'unknown',
        }),
      ],
      locks: [],
      sensors: [],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const camerasTab = screen.getByRole('tab', { name: /Cameras/i });

    expect(camerasTab.innerHTML).toContain('bg-zinc-400');
    expect(camerasTab.innerHTML).not.toContain('bg-emerald-400');
  });

  it('does not show a presence tab dot in details', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.entry_motion',
          name: 'Entry Motion',
          room: 'Entrance',
          securityKind: 'motion',
          securitySeverity: 'active',
          value: 'Motion detected',
        }),
        sensor({
          id: 'binary_sensor.presence_unavailable',
          name: 'Presence Sensor',
          room: 'Hall',
          securityKind: 'deviceTracker',
          securitySeverity: 'unknown',
          value: 'Unavailable',
        }),
      ],
      persons: [person({ id: 'person.vishal', name: 'Vishal', state: 'away', location: 'Away' })],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const presenceTab = screen.getByRole('tab', { name: /Presence/i });

    expect(presenceTab.innerHTML).not.toContain('rounded-full');
  });

  it('switches to the matching detail tab when an attention row is clicked', () => {
    renderDashboard();

    const accessTab = screen.getByRole('tab', { name: /Doors & windows/i });
    expect(accessTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Side Door/i }));

    expect(screen.getByRole('tab', { name: /Doors & windows/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('detail-card:binary_sensor.side_door')).toBeInTheDocument();
  });

  it('opens the live camera viewer when a live camera row is clicked', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway Camera',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          securitySeverity: 'active',
        }),
      ],
      locks: [],
      sensors: [],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    expect(screen.queryByText('Viewer:Driveway Camera')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Driveway Camera/i }));

    expect(screen.getByText('Viewer:Driveway Camera')).toBeInTheDocument();
  });

  it('shows device status instead of generic active label in the live lane', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway Camera',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          securitySeverity: 'active',
          entityPicture: '/api/camera_proxy/camera.driveway',
        }),
      ],
      locks: [],
      sensors: [],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const liveRow = screen.getByRole('button', { name: /Driveway Camera/i });

    expect(liveRow).toHaveTextContent('Streaming');
    expect(liveRow).not.toHaveTextContent('Active');
    expect(liveRow.innerHTML).toContain('bg-emerald-400');
    expect(liveRow.innerHTML).toContain('text-emerald-300');
    expect(screen.getByTestId('live-thumbnail:camera.driveway')).toHaveAttribute(
      'src',
      expect.stringContaining('/api/camera_proxy/camera.driveway')
    );
  });

  it('uses a related camera snapshot for live motion rows when sourceDeviceId matches', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.backyard',
          name: 'Backyard Camera',
          room: 'Backyard',
          entityPicture: '/api/camera_proxy/camera.backyard',
          sourceDeviceId: 'device-backyard-cam',
          securitySeverity: 'normal',
        }),
      ],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.movement_backyard',
          name: 'Movement Backyard',
          room: 'Backyard',
          securityKind: 'motion',
          securitySeverity: 'active',
          value: 'Motion detected',
          sourceDeviceId: 'device-backyard-cam',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const liveRow = screen.getByRole('button', { name: /Movement Backyard/i });

    expect(liveRow).toHaveTextContent('Motion detected');
    expect(liveRow.innerHTML).toContain('bg-amber-300');
    expect(liveRow.innerHTML).toContain('text-amber-200');
    expect(screen.getByTestId('live-thumbnail:binary_sensor.movement_backyard')).toHaveAttribute(
      'src',
      expect.stringContaining('/api/camera_proxy/camera.backyard')
    );
  });

  it('uses red warning styling for open opening rows and their detail tab', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          room: 'Side Entry',
          securityKind: 'door',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
        }),
      ],
    });

    renderWithProviders(
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        surface={getThemeSurfaceTokens('glass')}
      />
    );

    const openingRow = screen.getByRole('button', { name: /Side Door/i });
    const openingsTab = screen.getByRole('tab', { name: /Doors & windows/i });

    expect(openingRow).toHaveTextContent('Open');
    expect(openingRow).not.toHaveTextContent('Active');
    expect(openingRow.innerHTML).toContain('text-red-300');
    expect(openingRow.innerHTML).toContain('bg-red-400');
    expect(openingsTab.innerHTML).toContain('bg-red-400');
  });
});
