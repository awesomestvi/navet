import { RUNTIME_SAMPLE_MEDIA } from '@navet/app/assets/runtime-sample-images';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { defaultSettings, useSettingsStore } from '@navet/app/stores/settings-store';
import type { ThemeMode } from '@navet/app/stores/theme-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { CameraDevice, LockDevice, SensorDevice } from '@navet/app/types/device.types';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useEffect } from 'react';
import { buildSecurityCameraDashboardModel } from '../utils/security-camera-dashboard-model';
import { SecurityCameraDashboard } from './security-camera-dashboard';

function ThemeDecorator({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  useEffect(() => {
    const previousTheme = useThemeStore.getState();
    const previousSettings = useSettingsStore.getState();

    useThemeStore.setState({
      ...previousTheme,
      theme,
      followSystemTheme: false,
      primaryColor: 'green',
      customPrimaryColor: null,
      wallpaper: null,
    });

    useSettingsStore.setState({
      ...previousSettings,
      ...defaultSettings,
      effectsQuality: 'high',
      disableAnimations: false,
      lowPowerMode: false,
    });

    return () => {
      useThemeStore.setState(previousTheme);
      useSettingsStore.setState(previousSettings);
    };
  }, [theme]);

  return <>{children}</>;
}

function withTheme(theme: ThemeMode): Decorator {
  return (Story) => (
    <ThemeDecorator theme={theme}>
      <Story />
    </ThemeDecorator>
  );
}

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
  },
  {
    id: 'lock.back_door',
    name: 'Back Door',
    room: 'Kitchen',
    size: 'small',
    state: false,
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

interface SecurityDashboardStoryProps {
  cameras: CameraDevice[];
  locks: LockDevice[];
  sensors: SensorDevice[];
}

function SecurityDashboardStory({ cameras, locks, sensors }: SecurityDashboardStoryProps) {
  const { theme } = useThemeStore();
  const surface = getThemeSurfaceTokens(theme);
  const model = buildSecurityCameraDashboardModel({ cameras, locks, sensors });

  return (
    <div className="min-h-screen bg-[#050608] p-4 md:p-6">
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={noopCardSizeChange}
        surface={surface}
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
  decorators: [withTheme('glass')],
  args: {
    cameras: [liveCamera, idleCamera, gardenCamera, utilityCamera, unavailableCamera],
    locks,
    sensors: securitySensors,
  },
} satisfies Meta<typeof SecurityDashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SnapshotOnlyCurrentHaData: Story = {
  args: {
    cameras: [utilityCamera],
    locks,
    sensors: [],
  },
};

export const NoSecurityIssues: Story = {
  args: {
    cameras: [liveCamera, idleCamera, gardenCamera],
    locks: locks.map((lock) => ({ ...lock, state: true })),
    sensors: securitySensors.map((sensor) =>
      sensor.id === 'alarm_control_panel.home'
        ? { ...sensor, value: 'disarmed', status: 'clear' }
        : { ...sensor, value: 'off', status: 'clear' }
    ),
  },
};

export const BlackTheme: Story = {
  decorators: [withTheme('black')],
};
