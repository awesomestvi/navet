import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { renderWithProviders } from '@navet/app/test/render';
import type {
  CameraDevice,
  DeviceWithType,
  LockDevice,
  SecurityKind,
  SecuritySeverity,
  SensorDevice,
} from '@navet/app/types/device.types';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecurityActivityKind } from '../../utils/security-activity-history';
import { buildSecurityCameraDashboardModel } from '../../utils/security-camera-dashboard-model';
import { SecurityCameraDashboard } from '../security-camera-dashboard';

const activityEventsMock = vi.hoisted(() => ({
  breakpointCols: 4,
  events: [] as Array<{
    id: string;
    entityId: string;
    device: DeviceWithType;
    kind: SecurityActivityKind;
    source: 'current';
    state: string;
    timestampMs: number | null;
  }>,
  historyAvailable: true,
  historyError: null as 'refresh' | 'older' | null,
  lastUpdatedAt: null as number | null,
  retry: vi.fn(async () => {}),
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  loadMore: vi.fn(async () => {}),
}));
const scrollIntoViewMock = vi.fn();

vi.mock('@navet/app/features/dashboard', async () => {
  const { DashboardEditActions } = await import(
    '@navet/app/features/dashboard/components/dashboard-edit-actions'
  );
  return {
    DashboardCardItem: ({
      device,
      onRemoveFromLayout,
      removeFromLayoutLabel,
    }: {
      device: { id: string; name: string };
      onRemoveFromLayout?: (id: string) => void;
      removeFromLayoutLabel?: string;
    }) => (
      <div data-testid={`detail-card:${device.id}`}>
        {device.name}
        {onRemoveFromLayout ? (
          <button
            type="button"
            data-dashboard-edit-action="remove-layout"
            data-card-id={device.id}
            aria-label={removeFromLayoutLabel}
          >
            Remove
          </button>
        ) : null}
      </div>
    ),
    DashboardEditActions,
  };
});

vi.mock('@navet/app/hooks/use-breakpoint-cols', () => ({
  useBreakpointCols: () => activityEventsMock.breakpointCols,
}));

vi.mock('../camera-card', () => ({
  CameraCard: ({ id, name }: { id: string; name: string }) => (
    <button type="button" data-testid={`camera-card:${id}`}>
      {name}
    </button>
  ),
}));

vi.mock('../camera-card/camera-live-viewer', () => ({
  CameraLiveViewer: ({ isOpen, name }: { isOpen: boolean; name: string }) =>
    isOpen ? <div>Viewer:{name}</div> : null,
}));

vi.mock('../../hooks/use-security-activity-history', () => ({
  SECURITY_ACTIVITY_EVENT_LIMIT: 200,
  useSecurityActivityHistory: () => activityEventsMock,
}));

function camera(
  overrides: Partial<CameraDevice> &
    Pick<CameraDevice, 'id' | 'name'> & { securitySeverity?: SecuritySeverity }
): CameraDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Outside',
    size: overrides.size ?? 'medium',
    providerId: overrides.providerId ?? 'home_assistant',
    state: overrides.state ?? 'idle',
    supportedFeatures: overrides.supportedFeatures ?? 0,
    isStreamCapable: overrides.isStreamCapable ?? true,
    isStillImageOnly: overrides.isStillImageOnly ?? false,
    entityPicture: overrides.entityPicture,
    motionDetected: overrides.motionDetected,
    motionChangedAt: overrides.motionChangedAt,
    securityKind: 'camera',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

function lock(
  overrides: Partial<LockDevice> &
    Pick<LockDevice, 'id' | 'name'> & { securitySeverity?: SecuritySeverity }
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
  };
}

function renderDashboard(
  overrides: Partial<Parameters<typeof buildSecurityCameraDashboardModel>[0]> = {},
  alarms: NavetAlarmEntity[] = [],
  isEditMode = false,
  onToggleEditMode = vi.fn()
) {
  const devices = {
    cameras: overrides.cameras ?? [],
    locks: overrides.locks ?? [],
    sensors: overrides.sensors ?? [],
    covers: overrides.covers ?? [],
    persons: overrides.persons ?? [],
    helpers: overrides.helpers ?? [],
  };
  return renderWithProviders(
    <SecurityCameraDashboard
      model={buildSecurityCameraDashboardModel(devices)}
      alarms={alarms}
      isEditMode={isEditMode}
      onToggleEditMode={onToggleEditMode}
      cardSizes={{}}
      updateCardSize={vi.fn()}
      surface={getThemeSurfaceTokens('dark')}
    />
  );
}

function selectQuickviewEntities(entityIds: string[]) {
  localStorage.setItem(
    STORAGE_KEYS.securityQuickviewPreferences,
    JSON.stringify({ mode: 'custom', entityIds })
  );
}

describe('SecurityCameraDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    activityEventsMock.breakpointCols = 4;
    activityEventsMock.events = [];
    activityEventsMock.historyAvailable = true;
    activityEventsMock.historyError = null;
    activityEventsMock.lastUpdatedAt = null;
    activityEventsMock.hasMore = false;
    activityEventsMock.isLoading = false;
    activityEventsMock.isLoadingMore = false;
    activityEventsMock.loadMore.mockClear();
    scrollIntoViewMock.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  it('pins a device through its button without hiding it from the device list', () => {
    selectQuickviewEntities([]);
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] }, [], true);
    fireEvent.click(screen.getByRole('button', { name: 'Pin Front Door to quickview' }));
    expect(
      within(screen.getByTestId('security-quickview-grid')).getByTestId('detail-card:camera.front')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('security-command-main-details')).getByTestId(
        'detail-card:camera.front'
      )
    ).toBeInTheDocument();
  });

  it('shows failed history refreshes with a retry and last successful update', () => {
    activityEventsMock.historyError = 'refresh';
    activityEventsMock.lastUpdatedAt = Date.now() - 300_000;
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] });
    const panel = within(screen.getByTestId('security-activity-panel'));
    expect(panel.getByText('Couldn’t refresh activity.')).toBeInTheDocument();
    expect(panel.getByText(/Last updated/)).toBeInTheDocument();
    expect(panel.queryByText('No recent activity.')).not.toBeInTheDocument();
    fireEvent.click(panel.getByRole('button', { name: 'Retry' }));
    expect(activityEventsMock.retry).toHaveBeenCalledOnce();
  });

  it('opens all critical devices and lets the user return to the normal groups', () => {
    renderDashboard({
      locks: [lock({ id: 'lock.front', name: 'Front Door' })],
      sensors: [
        sensor({
          id: 'sensor.smoke',
          name: 'Smoke',
          securityKind: 'smoke',
          securitySeverity: 'critical',
        }),
        sensor({
          id: 'sensor.leak',
          name: 'Leak',
          securityKind: 'waterLeak',
          securitySeverity: 'critical',
        }),
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Critical' }));
    const details = within(screen.getByTestId('security-command-main-details'));
    expect(details.getByTestId('detail-card:sensor.smoke')).toBeInTheDocument();
    expect(details.getByTestId('detail-card:sensor.leak')).toBeInTheDocument();
    expect(details.queryByTestId('detail-card:lock.front')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Locks' }));
    expect(details.getByTestId('detail-card:lock.front')).toBeInTheDocument();
  });

  it('labels camera availability without implying verified live playback', () => {
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door', state: 'idle' }),
        camera({ id: 'camera.side', name: 'Side Gate', state: 'unavailable' }),
      ],
    });
    const summary = screen.getByRole('button', { name: 'Open Cameras' });
    expect(summary).toHaveTextContent('1 available');
    fireEvent.click(summary);
    expect(screen.getByRole('tab', { name: 'Available cameras' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const details = within(screen.getByTestId('security-command-main-details'));
    expect(details.getByTestId('detail-card:camera.front')).toBeInTheDocument();
    expect(details.queryByTestId('detail-card:camera.side')).not.toBeInTheDocument();
  });

  it('opens a camera for a linked detection event using the device relationship', () => {
    const linkedCamera = {
      ...camera({ id: 'camera.front', name: 'Front Door' }),
      underlyingDeviceId: 'device.front',
    };
    const detection = {
      ...sensor({ id: 'sensor.person', name: 'Person', securityKind: 'motion' }),
      underlyingDeviceId: 'device.front',
    };
    activityEventsMock.events = [
      {
        id: 'motion.front',
        entityId: detection.id,
        device: { ...detection, type: 'sensors' },
        kind: 'motion',
        source: 'current',
        state: 'on',
        timestampMs: null,
      },
    ];
    renderDashboard({ cameras: [linkedCamera], sensors: [detection] });
    fireEvent.click(
      within(screen.getByTestId('security-activity-panel')).getByRole('button', {
        name: /Motion detected · Person/,
      })
    );
    expect(screen.getByText('Viewer:Front Door')).toBeInTheDocument();
  });

  it('keeps an empty saved quickview available as a drop target', () => {
    selectQuickviewEntities([]);
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] }, [], true);
    const quickview = within(screen.getByTestId('security-quickview-grid'));
    expect(quickview.queryByTestId('detail-card:camera.front')).not.toBeInTheDocument();
    expect(quickview.getByText('Drag cards here to pin them.')).toBeInTheDocument();
    expect(screen.getByTestId('security-command-main-details')).toHaveTextContent('Front Door');
  });

  it('omits an empty quickview section from the DOM outside edit mode', () => {
    selectQuickviewEntities([]);
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] });
    expect(screen.queryByTestId('security-quickview-grid')).not.toBeInTheDocument();
    expect(document.querySelector('[data-security-drop-zone="quickview"]')).toBeNull();
    expect(screen.getByTestId('security-command-main-details')).toHaveTextContent('Front Door');
  });

  it('removes a quickview card through its bottom dock without hiding the device', async () => {
    selectQuickviewEntities(['camera.front']);
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] }, [], true);
    const quickview = within(screen.getByTestId('security-quickview-grid'));
    fireEvent.click(quickview.getByRole('button', { name: 'Remove Front Door from quickview' }));
    expect(quickview.queryByTestId('detail-card:camera.front')).not.toBeInTheDocument();
    expect(screen.getByTestId('security-command-main-details')).toHaveTextContent('Front Door');
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEYS.securityQuickviewPreferences) ?? '{}')
      ).toEqual({ mode: 'custom', entityIds: [] })
    );
  });

  it('uses a camera-first command center without the retired All Security row', () => {
    selectQuickviewEntities(['camera.front']);
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock' })],
    });

    const overview = within(screen.getByTestId('security-quickview-grid'));
    expect(screen.getByTestId('security-command-center')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Live cameras' })).not.toBeInTheDocument();
    expect(overview.getByTestId('camera-card:camera.front')).toBeInTheDocument();
    expect(overview.queryByTestId('detail-card:lock.front')).not.toBeInTheDocument();
    expect(screen.queryByText('All Security')).not.toBeInTheDocument();
    expect(screen.queryByTestId('security-status-card')).not.toBeInTheDocument();
  });

  it('automatically prioritizes two camera feeds in quickview', () => {
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door' }),
        camera({ id: 'camera.garden', name: 'Garden' }),
        camera({ id: 'camera.side', name: 'Side Gate' }),
      ],
    });

    const overview = within(screen.getByTestId('security-quickview-grid'));
    expect(overview.getAllByTestId(/^camera-card:/)).toHaveLength(2);
    expect(overview.getByTestId('camera-card:camera.front')).toBeInTheDocument();
    expect(overview.getByTestId('camera-card:camera.garden')).toBeInTheDocument();
    expect(overview.queryByTestId('camera-card:camera.side')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose camera feeds' })).not.toBeInTheDocument();
    const outcome = screen.getByTestId('security-outcome-panel');
    expect(within(outcome).getByRole('heading')).toHaveClass('text-lg', 'font-bold');
    expect(outcome).toHaveTextContent(/normal/i);
  });

  it('renders camera feeds as a snap carousel with a next-card peek on mobile', () => {
    activityEventsMock.breakpointCols = 2;
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door' }),
        camera({ id: 'camera.garden', name: 'Garden' }),
      ],
    });

    const overview = within(screen.getByTestId('security-quickview-grid'));
    const carousel = overview.getByTestId('security-quickview-carousel');
    const items = overview.getAllByTestId('security-quickview-carousel-item');

    expect(carousel).toHaveClass('snap-x', 'snap-mandatory', 'overflow-x-auto');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveClass('snap-start', 'w-[84%]');
    expect(overview.queryByTestId('security-camera-mosaic')).not.toBeInTheDocument();
    expect(overview.queryByTestId('security-card-grid')).not.toBeInTheDocument();
  });

  it('uses a dominant feed with two stacked feeds for three pinned portrait cameras', () => {
    selectQuickviewEntities(['camera.front', 'camera.garden', 'camera.side']);
    activityEventsMock.breakpointCols = 4;
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door' }),
        camera({ id: 'camera.garden', name: 'Garden' }),
        camera({ id: 'camera.side', name: 'Side Gate' }),
      ],
    });

    const overview = within(screen.getByTestId('security-quickview-grid'));
    const mosaic = overview.getByTestId('security-camera-mosaic');
    const mosaicLayout = overview.getByTestId('security-camera-mosaic-layout');
    const cells = overview.getAllByTestId('security-camera-mosaic-cell');

    expect(mosaic).not.toHaveClass('aspect-video');
    expect(mosaic.parentElement).toHaveClass('col-span-4', 'row-span-4');
    expect(mosaicLayout).toHaveStyle({
      gridAutoRows: '82px',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    });
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveClass('row-span-2');
    expect(cells[1]).not.toHaveClass('row-span-2');
    expect(overview.queryByTestId('security-quickview-carousel')).not.toBeInTheDocument();
    expect(overview.queryByTestId('security-card-grid')).not.toBeInTheDocument();
  });

  it('uses four equal mosaic cells for four pinned portrait cameras', () => {
    selectQuickviewEntities(['camera.front', 'camera.garden', 'camera.side', 'camera.deck']);
    activityEventsMock.breakpointCols = 4;
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door' }),
        camera({ id: 'camera.garden', name: 'Garden' }),
        camera({ id: 'camera.side', name: 'Side Gate' }),
        camera({ id: 'camera.deck', name: 'Deck' }),
      ],
    });

    const mosaic = screen.getByTestId('security-camera-mosaic');
    const cells = screen.getAllByTestId('security-camera-mosaic-cell');

    expect(mosaic.querySelector('.grid-cols-2.grid-rows-2')).toBeInTheDocument();
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      expect(cell).not.toHaveClass('row-span-2');
    }
  });

  it('keeps independent camera cards in the wide desktop grid', () => {
    activityEventsMock.breakpointCols = 6;
    renderDashboard({
      cameras: [
        camera({ id: 'camera.front', name: 'Front Door' }),
        camera({ id: 'camera.garden', name: 'Garden' }),
      ],
    });

    const overview = within(screen.getByTestId('security-quickview-grid'));
    expect(overview.getByTestId('security-card-grid')).toBeInTheDocument();
    expect(overview.queryByTestId('security-camera-mosaic')).not.toBeInTheDocument();
    expect(overview.queryByTestId('security-quickview-carousel')).not.toBeInTheDocument();
  });

  it('places the internally scrollable Activity card last on mobile', () => {
    activityEventsMock.breakpointCols = 2;
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock' })],
    });

    expect(screen.getByTestId('security-activity-panel').parentElement).toHaveClass(
      'order-last',
      'md:order-none'
    );
    expect(screen.getByTestId('security-command-main-details')).toHaveClass('order-6');
  });

  it('groups critical hazards inside the Security sidebar', () => {
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      locks: [lock({ id: 'lock.patio', name: 'Patio Door', room: 'Patio', state: false })],
      sensors: [
        sensor({
          id: 'binary_sensor.smoke',
          name: 'Kitchen Smoke',
          room: 'Kitchen',
          securityKind: 'smoke',
          securitySeverity: 'critical',
          value: 'Smoke detected',
        }),
      ],
    });

    const alert = screen.getByTestId('security-alerts-panel');
    const sidebar = screen.getByTestId('security-command-sidebar');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('data-alert-tone', 'red');
    expect(alert).toHaveTextContent('Needs attention');
    expect(alert).toHaveTextContent(/1 critical/i);
    expect(within(alert).queryByTestId('security-alert-count')).not.toBeInTheDocument();
    expect(alert).toHaveTextContent('Kitchen Smoke');
    expect(alert).toHaveTextContent('Smoke detected');
    expect(alert).toHaveTextContent('Kitchen');
    expect(alert).toHaveTextContent('Patio Door');
    expect(within(alert).getAllByTestId('security-alert-row')).toHaveLength(2);
    expect(sidebar).toContainElement(alert);
    expect(alert.parentElement).toHaveClass('order-1');
  });

  it('keeps grouped alerts as the first item in the two-column Home-grid sidebar', () => {
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock', state: false })],
    });

    const alerts = screen.getByTestId('security-alerts-panel');
    expect(alerts).toHaveAttribute('data-alert-tone', 'red');
    expect(alerts).toHaveTextContent(/1 attention/i);
    const summaryAlertIcon = screen.getByTestId('info-badge-strip-icon-security-attention');
    expect(summaryAlertIcon).toHaveClass('border-red-400/45', 'bg-red-500/22');
    expect(summaryAlertIcon.querySelector('svg')).toHaveClass('lucide-triangle-alert');
    expect(
      screen.getByTestId('info-badge-strip-icon-pulse-security-attention')
    ).toBeInTheDocument();
    expect(within(alerts).queryByTestId('security-alert-count')).not.toBeInTheDocument();
    expect(within(alerts).getByRole('heading', { name: 'Needs attention' })).toHaveClass(
      'text-lg',
      'font-bold'
    );
    const alertRows = within(alerts).getAllByTestId('security-alert-row');
    expect(alertRows).toHaveLength(1);
    expect(alertRows[0]).toHaveAttribute('data-alert-tone', 'red');
    expect(screen.getByTestId('security-command-sidebar')).toContainElement(alerts);
    expect(alerts.parentElement).toHaveClass('order-1');
    expect(screen.queryByTestId('security-exception-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('security-outcome-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('security-quickview-grid')).toHaveClass('order-4');
    expect(screen.getByTestId('security-command-main')).toHaveClass(
      'contents',
      'md:flex',
      'md:flex-col'
    );
    expect(screen.getByTestId('security-command-main')).toHaveStyle({
      gridColumn: 'span 4 / span 4',
    });
    expect(screen.getByTestId('security-command-main')).toContainElement(
      screen.getByTestId('security-command-main-details')
    );
    expect(screen.getByTestId('security-command-sidebar')).toHaveClass(
      'contents',
      'md:block',
      'md:order-2'
    );
    expect(screen.getByTestId('security-command-sidebar')).toHaveStyle({
      gridColumn: 'span 4 / span 4',
    });
    expect(screen.getByTestId('security-command-grid').style.gridTemplateColumns).toContain(
      'repeat(8'
    );
    const overview = within(screen.getByTestId('security-quickview-grid'));
    expect(overview.getByTestId('security-camera-mosaic')).toBeInTheDocument();
    expect(overview.queryByTestId('security-quickview-carousel')).not.toBeInTheDocument();
    expect(overview.queryByTestId('security-card-grid')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('security-command-main-details')).getByTestId('security-card-grid')
        .style.gridTemplateColumns
    ).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('identifies each unavailable device in its actionable alert row', () => {
    renderDashboard({
      sensors: [
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          securityKind: 'door',
          securitySeverity: 'unknown',
          status: 'unavailable',
          value: 'Unavailable',
        }),
      ],
    });

    expect(screen.getByRole('button', { name: 'Side Door: Unavailable' })).toBeInTheDocument();
  });

  it('opens all unavailable devices from the summary pill', async () => {
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      sensors: [
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          securityKind: 'door',
          securitySeverity: 'unknown',
          status: 'unavailable',
          value: 'Unavailable',
        }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Unavailable' }));

    expect(screen.getByRole('tab', { name: 'Unavailable' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('detail-card:binary_sensor.side_door')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-card:camera.front')).not.toBeInTheDocument();
  });

  it('opens all attention devices from the summary pill', async () => {
    localStorage.setItem('navet-security-dashboard-selected-group', JSON.stringify('cameras'));
    renderDashboard({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      locks: [lock({ id: 'lock.back', name: 'Back Door Lock', state: false })],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Attention' }));

    expect(screen.getByRole('tab', { name: 'Attention' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('detail-card:lock.back')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-card:camera.front')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Cameras' }));
    expect(screen.getByTestId('detail-card:camera.front')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Attention' })).not.toBeInTheDocument();
  });

  it('groups security cards by type by default and can regroup them by room', () => {
    renderDashboard({
      cameras: [camera({ id: 'camera.garage', name: 'Garage Camera', room: 'Garage' })],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock', room: 'Entrance' })],
      sensors: [
        sensor({
          id: 'binary_sensor.patio_door',
          name: 'Patio Door',
          room: 'Garden',
          securityKind: 'door',
          securitySeverity: 'warning',
          value: 'Open',
        }),
      ],
    });

    const groupingTrigger = screen.getByRole('button', { name: 'Group cards by: Type' });
    expect(screen.getByRole('tab', { name: 'Doors & windows' })).toBeInTheDocument();

    fireEvent.pointerDown(groupingTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Room' }));

    expect(screen.getByRole('button', { name: 'Group cards by: Room' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Garden' }));
    expect(screen.getByTestId('detail-card:binary_sensor.patio_door')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-card:lock.front')).not.toBeInTheDocument();
  });

  it('renders a manually ordered mix of security entity types', () => {
    selectQuickviewEntities(['lock.front', 'camera.a', 'binary_sensor.smoke']);
    renderDashboard({
      cameras: [camera({ id: 'camera.a', name: 'A Camera' })],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock' })],
      sensors: [sensor({ id: 'binary_sensor.smoke', name: 'Smoke', securityKind: 'smoke' })],
    });

    const cards = within(screen.getByTestId('security-quickview-grid')).getAllByTestId(
      /^detail-card:/
    );
    expect(cards.map((item) => item.textContent)).toEqual(['Front Door Lock', 'A Camera', 'Smoke']);
  });

  it('keeps alarm controls prominent before camera feeds on mobile', () => {
    renderDashboard({ cameras: [camera({ id: 'camera.front', name: 'Front Door' })] }, [
      {
        id: 'home_assistant:alarm_control_panel.home',
        name: 'Home Alarm',
        state: 'disarmed',
        supportedActions: ['arm_home', 'arm_away', 'disarm'],
        codeFormat: 'none',
        provider: 'home_assistant',
        availability: 'available',
      },
    ]);

    const alarm = screen.getByTestId('security-alarm-compact');
    expect(alarm).toHaveAttribute('aria-label', 'Alarm controls');
    expect(within(alarm).queryByText('Alarm controls')).not.toBeInTheDocument();
    expect(alarm.querySelector('.navet-entity-card-header')).toBeNull();
    expect(screen.getByRole('button', { name: 'Arm Away' })).toBeInTheDocument();
    expect(alarm.parentElement).toHaveClass('order-3');
    expect(screen.getByTestId('security-quickview-grid')).toHaveClass('order-4');
  });

  it('navigates alert rows to their existing entity card and activity rows to camera details', async () => {
    const motionCamera = camera({
      id: 'camera.garden',
      name: 'Garden Camera',
      motionDetected: true,
      motionChangedAt: new Date().toISOString(),
      securitySeverity: 'active',
    });
    activityEventsMock.events = [
      {
        id: 'current:camera.garden:motion',
        entityId: motionCamera.id,
        device: { ...motionCamera, type: 'cameras' },
        kind: 'motion',
        source: 'current',
        state: 'detected',
        timestampMs: Date.now(),
      },
    ];
    renderDashboard({
      cameras: [motionCamera],
      locks: [lock({ id: 'lock.front', name: 'Front Door Lock', state: false })],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Front Door Lock unlocked' }));
    const lockCard = screen.getByTestId('detail-card:lock.front');
    const lockCardAnchor = lockCard.closest<HTMLElement>('[data-security-entity-id]');
    expect(lockCardAnchor).toHaveAttribute('data-security-entity-id', 'lock.front');
    await waitFor(() => expect(lockCardAnchor).toHaveFocus());
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });

    fireEvent.click(screen.getByRole('button', { name: /Motion detected · Garden Camera/i }));
    expect(screen.getByText('Viewer:Garden Camera')).toBeInTheDocument();
  });

  it('shows an unassigned label when an activity device has no room', () => {
    const motionCamera = camera({ id: 'camera.backyard', name: 'Movement Backyard', room: '' });
    activityEventsMock.events = [
      {
        id: 'current:camera.backyard:motion',
        entityId: motionCamera.id,
        device: { ...motionCamera, type: 'cameras' },
        kind: 'motion',
        source: 'current',
        state: 'detected',
        timestampMs: null,
      },
    ];

    renderDashboard({ cameras: [motionCamera] });

    const activity = within(screen.getByTestId('security-activity-panel'));
    expect(activity.getByText('Unassigned')).toHaveClass(
      'mt-0.5',
      'block',
      'truncate',
      'text-[10px]'
    );
  });

  it('does not offer older history when the activity state is empty', () => {
    activityEventsMock.hasMore = true;
    renderDashboard({ cameras: [camera({ id: 'camera.garden', name: 'Garden Camera' })] });

    const activity = within(screen.getByTestId('security-activity-panel'));
    expect(activity.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(activity.getByText('No recent activity.')).toBeInTheDocument();
    expect(activity.queryByRole('button', { name: 'Load older activity' })).not.toBeInTheDocument();
  });

  it('uses semantic marker tones for secure, attention, and insecure activity', () => {
    const motionCamera = camera({ id: 'camera.garden', name: 'Garden Camera' });
    const kinds: SecurityActivityKind[] = [
      'locked',
      'closed',
      'hazard-cleared',
      'motion',
      'unlocked',
      'opened',
      'hazard',
      'alarm',
      'system',
    ];
    activityEventsMock.events = kinds.map((kind, index) => ({
      id: `history:camera.garden:${kind}`,
      entityId: motionCamera.id,
      device: { ...motionCamera, type: 'cameras' as const },
      kind,
      source: 'current' as const,
      state: kind,
      timestampMs: Date.now() - index * 60_000,
    }));

    renderDashboard({ cameras: [motionCamera] });

    expect(
      screen.getAllByTestId('security-activity-marker').map((marker) => marker.dataset.activityTone)
    ).toEqual([
      'green',
      'green',
      'green',
      'neutral',
      'neutral',
      'neutral',
      'red',
      'neutral',
      'amber',
    ]);
  });

  it('groups activity by day and minute and only fetches older events explicitly', () => {
    const motionCamera = camera({ id: 'camera.garden', name: 'Garden Camera' });
    const newestTimestamp = new Date(2026, 7, 24, 10, 15).getTime();
    activityEventsMock.historyAvailable = true;
    activityEventsMock.hasMore = true;
    activityEventsMock.events = Array.from({ length: 7 }, (_, index) => ({
      id: `history:camera.garden:motion:${index}`,
      entityId: motionCamera.id,
      device: { ...motionCamera, type: 'cameras' as const },
      kind: 'motion' as const,
      source: 'current' as const,
      state: 'detected',
      timestampMs:
        index < 2 ? newestTimestamp : newestTimestamp - 24 * 60 * 60 * 1_000 - (index - 2) * 60_000,
    }));

    renderDashboard({ cameras: [motionCamera] });

    const activity = within(screen.getByTestId('security-activity-panel'));
    const activityRows = activity.getAllByRole('button', {
      name: /Motion detected · Garden Camera/i,
    });
    expect(activityRows).toHaveLength(7);
    for (const activityRow of activityRows) {
      expect(activityRow).toHaveClass('w-full', 'items-center', 'py-2');
      expect(activityRow).not.toHaveClass('border-b');
      expect(activityRow).toHaveClass('min-h-12', '[contain-intrinsic-size:auto_48px]');
    }
    expect(activity.getAllByTestId('security-activity-day')).toHaveLength(2);
    const dayLabels = activity.getAllByTestId('security-activity-day-label');
    for (const dayLabel of dayLabels) {
      expect(dayLabel.tagName).toBe('H4');
      expect(dayLabel.parentElement?.tagName).toBe('HEADER');
      expect(dayLabel.parentElement).toHaveClass('grid');
      expect(dayLabel.parentElement).not.toHaveClass('sticky');
      expect(dayLabel).toHaveClass('col-start-3', 'font-medium');
      expect(dayLabel.children).toHaveLength(0);
    }
    expect(activity.queryByTestId('security-activity-floating-day-label')).not.toBeInTheDocument();
    expect(activity.getAllByTestId('security-activity-time')).toHaveLength(6);
    for (const timestamp of activity.getAllByTestId('security-activity-time')) {
      expect(timestamp).toHaveClass('text-right', 'tabular-nums');
    }
    expect(activity.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(activity.queryByText('24 hours')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('security-activity-panel').querySelector('.navet-entity-card-header')
    ).toBeInTheDocument();
    expect(activity.getByTestId('security-activity-scroll')).toHaveClass(
      'overflow-y-auto',
      'overscroll-contain',
      'touch-pan-y'
    );
    expect(activity.getByTestId('security-activity-scroll').parentElement).toHaveClass(
      'h-[21rem]',
      'md:h-96'
    );
    expect(activity.getByTestId('security-activity-content')).toHaveClass('relative', 'isolate');
    expect(activity.getByTestId('security-activity-content')).not.toHaveClass(
      'border',
      'rounded-xl',
      'mx-3',
      'mb-3',
      'overflow-hidden'
    );
    expect(activity.queryByTestId('security-activity-timeline-gutter')).not.toBeInTheDocument();
    for (const marker of activity.getAllByTestId('security-activity-marker')) {
      expect(marker).toHaveClass('h-7', 'w-7');
      expect(marker.firstElementChild).toHaveClass(
        'rounded-full',
        '!h-7',
        '!w-7',
        '!shadow-none',
        '!drop-shadow-none'
      );
      expect(marker.firstElementChild?.firstElementChild).toHaveClass('!drop-shadow-none');
    }
    const eventContent = activity.getAllByTestId('security-activity-event-content');
    for (const content of eventContent) {
      expect(content).not.toHaveClass('border-b');
    }
    expect(eventContent.filter((content) => content.classList.contains('border-b'))).toHaveLength(
      0
    );
    expect(eventContent[0]).not.toHaveClass('border-b');
    expect(activity.queryByTestId('security-activity-same-time-divider')).not.toBeInTheDocument();
    for (const timelineLine of activity.getAllByTestId('security-activity-timeline-line')) {
      expect(timelineLine).toHaveClass(
        'border-l',
        'top-1/2',
        'bottom-0',
        'opacity-50',
        'left-[5.25rem]'
      );
      expect(timelineLine).not.toHaveClass('border-dashed');
    }
    for (const timelineLine of activity.getAllByTestId(
      'security-activity-timeline-line-incoming'
    )) {
      expect(timelineLine).toHaveClass(
        'border-l',
        'top-0',
        'bottom-1/2',
        'opacity-50',
        'left-[5.25rem]'
      );
      expect(timelineLine).not.toHaveClass('border-dashed');
    }
    expect(activity.getByTestId('security-activity-scroll')).toHaveAttribute('tabindex', '0');
    const scrollViewport = activity.getByTestId('security-activity-scroll');
    Object.defineProperties(scrollViewport, {
      clientHeight: { configurable: true, value: 384 },
      scrollHeight: { configurable: true, value: 900 },
      scrollTop: { configurable: true, value: 440 },
    });
    fireEvent.scroll(scrollViewport);
    expect(activityEventsMock.loadMore).not.toHaveBeenCalled();
    fireEvent.click(activity.getByRole('button', { name: 'Load older activity' }));
    expect(activityEventsMock.loadMore).toHaveBeenCalledTimes(1);
  });
});
