import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecuritySection } from './security-section';

const securityDashboardMock = vi.fn();
const addEntityDialogMock = vi.fn();

const devicesFixture: DeviceCollection = {
  lights: [],
  fans: [],
  hvac: [],
  climate: [],
  media: [],
  weather: [],
  switches: [],
  helpers: [
    {
      id: 'button.panic',
      name: 'Panic Button',
      room: 'Hall',
      size: 'small',
      state: false,
      serviceDomain: 'button',
      serviceAction: 'press',
      securityKind: 'button',
      securitySeverity: 'normal',
    },
  ],
  covers: [
    {
      id: 'cover.entry_shutter',
      name: 'Entry Shutter',
      room: 'Entrance',
      size: 'medium',
      position: 0,
      hasPosition: true,
    },
  ],
  locks: [
    {
      id: 'lock.front',
      name: 'Front Door',
      room: 'Entrance',
      size: 'small',
      state: false,
      securityKind: 'lock',
      securitySeverity: 'warning',
    },
  ],
  scenes: [],
  persons: [],
  sensors: [
    {
      id: 'binary_sensor.smoke',
      name: 'Kitchen Smoke',
      room: 'Kitchen',
      size: 'small',
      value: 'Smoke detected',
      unit: '',
      status: 'active',
      securityKind: 'smoke',
      securitySeverity: 'critical',
    },
  ],
  vacuums: [],
  calendars: [],
  cameras: [
    {
      id: 'camera.garage',
      name: 'Garage Camera',
      room: 'Garage',
      size: 'medium',
      state: 'idle',
      supportedFeatures: 0,
      isStreamCapable: true,
      isStillImageOnly: false,
      securityKind: 'camera',
      securitySeverity: 'normal',
    },
  ],
  'grouped-sensors': [],
};

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useDevices: () => devicesFixture,
    useEditMode: () => ({
      isEditMode: true,
      toggleEditMode: vi.fn(),
    }),
    useCardState: () => ({
      cardSizes: {},
      updateCardSize: vi.fn(),
    }),
    useThemeMode: () => 'glass',
    useTheme: () => ({
      theme: 'glass',
      accentColor: '#f97316',
      primaryColor: '#f97316',
    }),
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@navet/app/features/security/components/security-camera-dashboard', () => ({
  SecurityCameraDashboard: (props: {
    model: { allEntities: Array<{ id: string }> };
    isEditMode: boolean;
    onToggleEditMode: () => void;
  }) => {
    securityDashboardMock(props);
    return (
      <div>
        <button type="button" onClick={props.onToggleEditMode}>
          {props.isEditMode ? 'dashboard.roomNav.doneEditing' : 'dashboard.roomNav.customize'}
        </button>
        <div data-testid="security-dashboard">{props.model.allEntities.length}</div>
      </div>
    );
  },
}));

vi.mock('@navet/app/features/dashboard', async () => {
  const actual = await vi.importActual<object>('@navet/app/features/dashboard');
  return {
    ...actual,
    AddEntityDialog: (props: { open: boolean; visibleEntityIds: string[] }) => {
      addEntityDialogMock(props);
      return props.open ? (
        <div data-testid="add-entity-dialog">{props.visibleEntityIds.join(',')}</div>
      ) : null;
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('SecuritySection', () => {
  beforeEach(() => {
    localStorage.clear();
    securityDashboardMock.mockClear();
    addEntityDialogMock.mockClear();
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: [],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });
  });

  it('passes only visible security entities into the dashboard summary', () => {
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: ['camera.garage'],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });

    renderWithProviders(<SecuritySection />);

    expect(screen.getByTestId('security-dashboard')).toHaveTextContent('4');
    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          allEntities: expect.not.arrayContaining([
            expect.objectContaining({ id: 'camera.garage' }),
          ]),
        }),
      })
    );
  });

  it('shows the section customize toggle so security cards can be resized', () => {
    renderWithProviders(<SecuritySection />);

    expect(
      screen.getByRole('button', { name: /dashboard.roomNav.doneEditing/i })
    ).toBeInTheDocument();
  });

  it('keeps the full hidden security set available in the add-entity dialog', () => {
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: ['camera.garage', 'button.panic', 'cover.entry_shutter'],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });

    renderWithProviders(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: /dashboard.addEntity.title/i }));

    expect(screen.getByTestId('add-entity-dialog')).toHaveTextContent(
      'cover.entry_shutter,camera.garage,button.panic'
    );
    expect(addEntityDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleEntityIds: ['cover.entry_shutter', 'camera.garage', 'button.panic'],
      })
    );
  });
});
