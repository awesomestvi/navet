import { RUNTIME_SAMPLE_MEDIA } from '@navet/app/assets/runtime-sample-images';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { CameraDevice, LockDevice, SensorDevice } from '@navet/app/types/device.types';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { buildSecurityCameraDashboardModel } from '../utils/security-camera-dashboard-model';
import { SecurityCameraDashboard } from './security-camera-dashboard';

const liveCamera: CameraDevice = {
  id: 'camera.front_door',
  name: 'Front Door',
  room: 'Entrance',
  entityPicture: RUNTIME_SAMPLE_MEDIA.camera,
  size: 'medium',
  state: 'streaming',
  supportedFeatures: 2,
  isStreamCapable: true,
  isStillImageOnly: false,
  lastChanged: '2026-05-15T19:48:00.000Z',
  lastUpdated: '2026-05-15T19:48:00.000Z',
};

const idleCamera: CameraDevice = {
  id: 'camera.driveway',
  name: 'Driveway',
  room: 'Garage',
  entityPicture: RUNTIME_SAMPLE_MEDIA.camera,
  size: 'medium',
  state: 'idle',
  supportedFeatures: 2,
  isStreamCapable: true,
  isStillImageOnly: false,
  lastChanged: '2026-05-15T18:20:00.000Z',
  lastUpdated: '2026-05-15T18:20:00.000Z',
};

const gardenCamera: CameraDevice = {
  id: 'camera.garden',
  name: 'Garden',
  room: 'Garden',
  entityPicture: RUNTIME_SAMPLE_MEDIA.camera,
  size: 'medium',
  state: 'recording',
  supportedFeatures: 2,
  isStreamCapable: true,
  isStillImageOnly: false,
  lastChanged: '2026-05-15T20:10:00.000Z',
  lastUpdated: '2026-05-15T20:10:00.000Z',
};

const utilityCamera: CameraDevice = {
  id: 'camera.l10s_ultra_gen_2_map',
  name: 'L10s Ultra Gen 2 Current Map',
  room: 'Utility',
  entityPicture: RUNTIME_SAMPLE_MEDIA.camera,
  size: 'medium',
  state: '2026-05-15 20:17:10',
  supportedFeatures: 0,
  isStreamCapable: false,
  isStillImageOnly: true,
  lastChanged: '2026-05-15T20:17:10.000Z',
  lastUpdated: '2026-05-15T20:17:10.000Z',
};

const unavailableCamera: CameraDevice = {
  id: 'camera.side_gate',
  name: 'Side Gate',
  room: 'Garden',
  size: 'medium',
  state: 'unavailable',
  supportedFeatures: 2,
  isStreamCapable: true,
  isStillImageOnly: false,
  lastChanged: '2026-05-15T16:30:00.000Z',
  lastUpdated: '2026-05-15T16:30:00.000Z',
};

const locks: LockDevice[] = [
  {
    id: 'lock.front_door',
    name: 'Front Door',
    room: 'Entrance',
    size: 'small',
    state: true,
    securityKind: 'lock',
    securitySeverity: 'normal',
  },
  {
    id: 'lock.back_door',
    name: 'Back Door',
    room: 'Kitchen',
    size: 'small',
    state: false,
    securityKind: 'lock',
    securitySeverity: 'warning',
  },
];

const securitySensors: SensorDevice[] = [
  {
    id: 'binary_sensor.entry_motion',
    nativeId: 'binary_sensor.entry_motion',
    name: 'Entry Motion',
    room: 'Entrance',
    size: 'small',
    value: 'on',
    unit: '',
    deviceClass: 'motion',
    status: 'active',
  },
  {
    id: 'binary_sensor.patio_door',
    nativeId: 'binary_sensor.patio_door',
    name: 'Patio Door',
    room: 'Garden',
    size: 'small',
    value: 'on',
    unit: '',
    deviceClass: 'door',
    status: 'active',
  },
  {
    id: 'alarm_control_panel.home',
    nativeId: 'alarm_control_panel.home',
    name: 'Home Alarm',
    room: 'Entrance',
    size: 'small',
    value: 'armed_home',
    unit: '',
    status: 'active',
  },
];

const criticalSmokeSensor: SensorDevice = {
  id: 'binary_sensor.kitchen_smoke',
  nativeId: 'binary_sensor.kitchen_smoke',
  name: 'Kitchen Smoke',
  room: 'Kitchen',
  size: 'small',
  value: 'Smoke detected',
  unit: '',
  deviceClass: 'smoke',
  status: 'active',
  securityKind: 'smoke',
  securitySeverity: 'critical',
};

const unavailableDoorSensor: SensorDevice = {
  id: 'binary_sensor.side_door',
  nativeId: 'binary_sensor.side_door',
  name: 'Side Door',
  room: 'Garden',
  size: 'small',
  value: 'Unavailable',
  unit: '',
  deviceClass: 'door',
  status: 'unavailable',
  securityKind: 'door',
  securitySeverity: 'unknown',
};

const warningAlertSensors: SensorDevice[] = [
  {
    id: 'binary_sensor.patio_opening',
    nativeId: 'binary_sensor.patio_opening',
    name: 'Patio Door',
    room: 'Garden',
    size: 'small',
    value: 'Open',
    unit: '',
    deviceClass: 'door',
    status: 'active',
    securityKind: 'door',
    securitySeverity: 'warning',
  },
  {
    id: 'binary_sensor.garden_motion',
    nativeId: 'binary_sensor.garden_motion',
    name: 'Garden Motion',
    room: 'Garden',
    size: 'small',
    value: 'Motion detected',
    unit: '',
    deviceClass: 'motion',
    status: 'active',
    securityKind: 'motion',
    securitySeverity: 'warning',
  },
  ...Array.from({ length: 6 }, (_, index): SensorDevice => {
    const itemNumber = index + 1;
    return {
      id: `binary_sensor.warning_${itemNumber}`,
      nativeId: `binary_sensor.warning_${itemNumber}`,
      name: `Attention Sensor ${itemNumber}`,
      room: itemNumber % 2 === 0 ? 'Upstairs' : 'Downstairs',
      size: 'small',
      value: 'Needs attention',
      unit: '',
      deviceClass: 'opening',
      status: 'active',
      securityKind: 'opening',
      securitySeverity: 'warning',
    };
  }),
];

const homeAlarm: NavetAlarmEntity = {
  id: 'home_assistant:alarm_control_panel.home',
  name: 'Home Alarm',
  state: 'armed_home',
  supportedActions: ['arm_home', 'arm_away', 'arm_night', 'disarm'],
  codeFormat: 'number',
  requiresCode: true,
  provider: 'home_assistant',
  availability: 'available',
};

interface SecurityDashboardStoryProps {
  cameras: CameraDevice[];
  locks: LockDevice[];
  sensors: SensorDevice[];
  alarms: NavetAlarmEntity[];
  isOverviewCustomizationOpen?: boolean;
}

function SecurityDashboardStory({
  cameras,
  locks,
  sensors,
  alarms,
  isOverviewCustomizationOpen = false,
}: SecurityDashboardStoryProps) {
  const { theme } = useThemeStore();
  const surface = getThemeSurfaceTokens(theme);
  const model = buildSecurityCameraDashboardModel({ cameras, locks, sensors });

  return (
    <div className={`min-h-screen p-4 md:p-6 ${surface.appBg}`}>
      <SecurityCameraDashboard
        model={model}
        alarms={alarms}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={noopCardSizeChange}
        surface={surface}
        isOverviewCustomizationOpen={isOverviewCustomizationOpen}
        onOverviewCustomizationOpenChange={() => undefined}
      />
    </div>
  );
}

const meta = {
  title: 'Pages/Security/Dashboard/Page',
  component: SecurityDashboardStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop1080p',
    },
  },
  args: {
    cameras: [liveCamera, idleCamera, gardenCamera, utilityCamera, unavailableCamera],
    locks,
    sensors: securitySensors,
    alarms: [homeAlarm],
    isOverviewCustomizationOpen: false,
  },
} satisfies Meta<typeof SecurityDashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Home Alarm' })).toBeVisible();
  },
};

export const CustomizeOverview: Story = {
  args: {
    isOverviewCustomizationOpen: true,
  },
};

export const SnapshotOnlyCurrentHaData: Story = {
  args: {
    cameras: [utilityCamera],
    locks,
    sensors: [],
    alarms: [],
  },
};

export const NoSecurityIssues: Story = {
  args: {
    cameras: [liveCamera, idleCamera, gardenCamera],
    locks: locks.map((lock) => ({ ...lock, state: true, securitySeverity: 'normal' })),
    sensors: securitySensors.map((sensor) =>
      sensor.id === 'alarm_control_panel.home'
        ? { ...sensor, value: 'disarmed', status: 'clear' }
        : { ...sensor, value: 'off', status: 'clear' }
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId('security-alerts-panel')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('security-outcome-panel')).toBeVisible();
  },
};

export const AttentionOnly: Story = {
  args: {
    cameras: [liveCamera, idleCamera],
    locks: locks.map((lock) => ({ ...lock, state: true, securitySeverity: 'normal' })),
    sensors: warningAlertSensors.slice(0, 2),
    alarms: [],
  },
  play: async ({ canvas }) => {
    const alertPanel = await canvas.findByTestId('security-alerts-panel');
    await expect(alertPanel).toHaveAttribute('data-alert-tone', 'yellow');
    await expect(canvas.getByText(/2 attention/i)).toBeVisible();
  },
};

export const CriticalAlert: Story = {
  args: {
    cameras: [liveCamera, idleCamera],
    locks,
    sensors: [criticalSmokeSensor, ...securitySensors],
  },
  play: async ({ canvas }) => {
    const alertPanel = await canvas.findByTestId('security-alerts-panel');
    await expect(alertPanel).toHaveAttribute('data-alert-tone', 'red');
    await expect(canvas.getByText(/2 critical/i)).toBeVisible();
  },
};

export const MixedCriticalAndAttention: Story = {
  args: {
    cameras: [liveCamera, idleCamera],
    locks,
    sensors: [criticalSmokeSensor, ...warningAlertSensors.slice(0, 2)],
    alarms: [],
  },
  play: async ({ canvas }) => {
    const alertPanel = await canvas.findByTestId('security-alerts-panel');
    await expect(alertPanel).toHaveAttribute('data-alert-tone', 'red');
    await expect(canvas.getByText(/2 critical/i)).toBeVisible();
    await expect(canvas.getAllByTestId('security-alert-row')).toHaveLength(4);
  },
};

export const ManyAlerts: Story = {
  args: {
    cameras: [liveCamera, idleCamera],
    locks: locks.map((lock) => ({ ...lock, state: false, securitySeverity: 'warning' })),
    sensors: [criticalSmokeSensor, ...warningAlertSensors],
    alarms: [],
  },
  play: async ({ canvas }) => {
    const alertPanel = await canvas.findByTestId('security-alerts-panel');
    await expect(alertPanel).toHaveAttribute('data-alert-tone', 'red');
    await expect(canvas.getByText(/3 critical/i)).toBeVisible();
    await expect(canvas.getAllByTestId('security-alert-row')).toHaveLength(11);
  },
};

export const UnavailableOnly: Story = {
  args: {
    cameras: [unavailableCamera],
    locks: [],
    sensors: [
      unavailableDoorSensor,
      {
        ...unavailableDoorSensor,
        id: 'binary_sensor.utility_window',
        nativeId: 'binary_sensor.utility_window',
        name: 'Utility Window',
        room: 'Utility room',
        deviceClass: 'window',
        securityKind: 'window',
      },
    ],
  },
  play: async ({ canvas }) => {
    const alertPanel = canvas.getByTestId('security-alerts-panel');
    await expect(alertPanel).toHaveAttribute('data-alert-tone', 'neutral');
    await expect(alertPanel).toHaveTextContent(/2 unavailable/i);
    await expect(canvas.getByRole('button', { name: 'Side Door: Unavailable' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Utility Window: Unavailable' })).toBeVisible();
  },
};

export const WallTablet: Story = {
  globals: {
    viewport: {
      value: 'tabletLandscape',
      isRotated: false,
    },
  },
};

export const TabletPortrait: Story = {
  globals: { viewport: { value: 'ipadPro', isRotated: false } },
};

export const Phone: Story = {
  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
};

export const PhoneCritical: Story = {
  args: CriticalAlert.args,
  globals: { viewport: { value: 'iphone14', isRotated: false } },
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const BlackTheme: Story = {
  globals: { theme: 'black' },
};
