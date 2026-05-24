import type { Decorator, Meta, StoryObj } from '@storybook/react';
import type { HassEntities } from 'home-assistant-js-websocket';
import { type ReactNode, useEffect } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { defaultSettings, useSettingsStore } from '@/app/stores/settings-store';
import type { ThemeMode } from '@/app/stores/theme-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { noopCardSizeChange } from '@/app/storybook/story-frames';
import type { CameraDevice, LockDevice } from '@/app/types/device.types';
import cameraSampleImage from '@/assets/camera-sample.webp';
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
  entityPicture: cameraSampleImage,
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
  entityPicture: cameraSampleImage,
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
  entityPicture: cameraSampleImage,
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
  entityPicture: cameraSampleImage,
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

const securityEntities: HassEntities = {
  'binary_sensor.entry_motion': {
    entity_id: 'binary_sensor.entry_motion',
    state: 'on',
    attributes: { friendly_name: 'Entry Motion', device_class: 'motion' },
    last_changed: '2026-05-15T20:12:00.000Z',
    last_updated: '2026-05-15T20:12:00.000Z',
    context: { id: 'context-motion', parent_id: null, user_id: null },
  },
  'binary_sensor.patio_door': {
    entity_id: 'binary_sensor.patio_door',
    state: 'on',
    attributes: { friendly_name: 'Patio Door', device_class: 'door' },
    last_changed: '2026-05-15T20:06:00.000Z',
    last_updated: '2026-05-15T20:06:00.000Z',
    context: { id: 'context-door', parent_id: null, user_id: null },
  },
  'alarm_control_panel.home': {
    entity_id: 'alarm_control_panel.home',
    state: 'armed_home',
    attributes: { friendly_name: 'Home Alarm' },
    last_changed: '2026-05-15T19:00:00.000Z',
    last_updated: '2026-05-15T19:00:00.000Z',
    context: { id: 'context-alarm', parent_id: null, user_id: null },
  },
};

const labels = {
  title: 'Security Cameras',
  subtitle: 'Camera overview',
  cameras: 'Cameras',
  live: 'Live',
  idle: 'Idle',
  unavailable: 'Unavailable',
  motion: 'Motion',
  locks: 'Locks secure',
  openSensors: 'Open sensors',
  alarms: 'Active alarms',
  sirens: 'Active sirens',
  primaryTitle: 'Camera feeds',
  stillTitle: 'Still image cameras',
  stillDescription:
    'These cameras look like maps or still-image utilities, so Navet keeps them separate from security feeds.',
  noPrimaryTitle: 'No live security feeds',
  noPrimaryDescription:
    'Navet found camera entities, but none look like live security cameras yet.',
  locksTitle: 'Smart Locks',
};

interface SecurityDashboardStoryProps {
  cameras: CameraDevice[];
  locks: LockDevice[];
  entities: HassEntities;
}

function SecurityDashboardStory({ cameras, locks, entities }: SecurityDashboardStoryProps) {
  const { theme } = useThemeStore();
  const surface = getThemeSurfaceTokens(theme);
  const model = buildSecurityCameraDashboardModel({ cameras, locks }, entities);

  return (
    <div className="min-h-screen bg-[#050608] p-4 md:p-6">
      <SecurityCameraDashboard
        model={model}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={noopCardSizeChange}
        surface={surface}
        labels={labels}
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
    entities: securityEntities,
  },
} satisfies Meta<typeof SecurityDashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SnapshotOnlyCurrentHaData: Story = {
  args: {
    cameras: [utilityCamera],
    locks,
    entities: {},
  },
};

export const NoSecurityIssues: Story = {
  args: {
    cameras: [liveCamera, idleCamera, gardenCamera],
    locks: locks.map((lock) => ({ ...lock, state: true })),
    entities: {
      'binary_sensor.entry_motion': {
        ...securityEntities['binary_sensor.entry_motion'],
        state: 'off',
      },
      'binary_sensor.patio_door': {
        ...securityEntities['binary_sensor.patio_door'],
        state: 'off',
      },
      'alarm_control_panel.home': {
        ...securityEntities['alarm_control_panel.home'],
        state: 'disarmed',
      },
    },
  },
};

export const BlackTheme: Story = {
  decorators: [withTheme('black')],
};
