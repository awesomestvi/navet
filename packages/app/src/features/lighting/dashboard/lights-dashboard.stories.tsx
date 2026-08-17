import { integrationStore } from '@navet/app/stores/integration-store';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { LightsDashboard } from './lights-dashboard';

function device(
  id: string,
  name: string,
  room: string,
  state: boolean,
  brightness: number
): DeviceWithType {
  return {
    id,
    name,
    room,
    state,
    brightness,
    temp: 4000,
    size: 'small',
    type: 'lights',
    providerId: 'home_assistant',
  };
}

function entity(light: DeviceWithType, overrides: Partial<NavetEntity> = {}): NavetEntity {
  return {
    id: light.id,
    canonicalId: `home_assistant:${light.id}`,
    providerId: 'home_assistant',
    externalId: light.id,
    type: 'light',
    name: light.name,
    room: 'room' in light ? light.room : undefined,
    primaryState: 'state' in light && light.state ? 'on' : 'off',
    availability: 'available',
    attributes: {
      brightnessPct: 'brightness' in light ? light.brightness : undefined,
      colorTemperatureKelvin: 'temp' in light ? light.temp : undefined,
    },
    capabilities: ['toggle', 'brightness', 'color_temperature'],
    ...overrides,
  };
}

const baseLights = [
  device('light.kitchen_island', 'Kitchen island', 'Kitchen', true, 72),
  device('light.kitchen_window', 'Window lamp', 'Kitchen', false, 35),
  device('light.kitchen_plants', 'Plant light', 'Kitchen', true, 48),
  device('light.living_ceiling', 'Living room ceiling', 'Living room', false, 55),
  device('light.reading', 'Reading corner', 'Living room', true, 24),
  device('light.hall', 'Hallway', 'Hall', false, 100),
];

const largeHomeRoomLights = {
  Kitchen: ['Island lights', 'Plant light', 'Window lamp', 'Dining table lamp'],
  Bathroom: ['Ceiling lights', 'Mirror light'],
  Hallway: ['Backside ceiling lights', 'Front ceiling light', 'Cloakroom lights'],
  Bedroom: ['Ceiling lights', 'Left reading lamp', 'Right reading lamp', 'Accent lights'],
  'Guest room': ['Accent light'],
  Office: ['Neon lights', 'Desk lamp', 'Shelf light'],
  Toilet: ['Ceiling light'],
  'Maya’s room': ['Ceiling lights', 'Bedside lamp', 'Galaxy projector'],
  'Living room': ['Corner lamp', 'Antique corner lamp'],
  Outside: ['Porch light'],
} as const;

const largeHomeLights = Object.entries(largeHomeRoomLights).flatMap(([room, names], roomIndex) =>
  names.map((name, lightIndex) =>
    device(
      `light.${room.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_')}_${lightIndex}`,
      name,
      room,
      (roomIndex + lightIndex) % 4 === 0,
      10 + ((roomIndex * 13 + lightIndex * 17) % 80)
    )
  )
);

function LightDashboardFixture({
  lights = baseLights,
  unavailableIds = [],
  nonDimmableIds = [],
  theme = 'glass',
  wallpaper = 'dark',
  children,
}: {
  lights?: DeviceWithType[];
  unavailableIds?: string[];
  nonDimmableIds?: string[];
  theme?: ThemeMode;
  wallpaper?: 'dark' | 'light';
  children: ReactNode;
}) {
  useEffect(() => {
    const previousIntegration = integrationStore.getState();
    const previousTheme = useThemeStore.getState();
    const entities = Object.fromEntries(
      lights.map((light) => {
        const next = entity(light, {
          availability: unavailableIds.includes(light.id) ? 'unavailable' : 'available',
          capabilities: nonDimmableIds.includes(light.id)
            ? ['toggle']
            : ['toggle', 'brightness', 'color_temperature'],
          lastUpdated: '2026-07-14T18:30:00.000Z',
        });
        return [next.canonicalId, next];
      })
    );
    integrationStore.setState({
      ...previousIntegration,
      providerEntitiesByCanonicalId: entities,
    });
    useThemeStore.setState({
      ...previousTheme,
      theme,
      followSystemTheme: false,
      wallpaper: null,
    });
    return () => {
      integrationStore.setState(previousIntegration);
      useThemeStore.setState(previousTheme);
    };
  }, [lights, nonDimmableIds, theme, unavailableIds]);

  return (
    <div
      className="min-h-screen p-3 md:p-6"
      style={{
        background:
          wallpaper === 'light'
            ? 'linear-gradient(145deg, #eef2f0, #cfd8d4)'
            : 'linear-gradient(145deg, #111827, #07111f 55%, #172033)',
      }}
    >
      {children}
    </div>
  );
}

function DashboardStory(
  args: ComponentProps<typeof LightsDashboard> &
    Pick<
      ComponentProps<typeof LightDashboardFixture>,
      'unavailableIds' | 'nonDimmableIds' | 'theme' | 'wallpaper'
    >
) {
  const { unavailableIds, nonDimmableIds, theme, wallpaper, ...dashboardProps } = args;
  return (
    <LightDashboardFixture
      lights={Array.from(dashboardProps.deviceMap.values())}
      unavailableIds={unavailableIds}
      nonDimmableIds={nonDimmableIds}
      theme={theme}
      wallpaper={wallpaper}
    >
      <LightsDashboard {...dashboardProps} />
    </LightDashboardFixture>
  );
}

const baseArgs = {
  deviceMap: new Map(baseLights.map((light) => [light.id, light])),
  rooms: ['Kitchen', 'Living room', 'Hall'],
  cardOrders: {
    Kitchen: ['light.kitchen_island', 'light.kitchen_plants', 'light.kitchen_window'],
    'Living room': ['light.reading', 'light.living_ceiling'],
    Hall: ['light.hall'],
  },
  scenes: [
    {
      id: 'scene.evening',
      type: 'scene' as const,
      name: 'Evening',
      room: 'Unassigned',
      state: 'off',
    },
    { id: 'scene.movie', type: 'scene' as const, name: 'Movie', room: 'Living room', state: 'off' },
  ],
  isEditMode: false,
  unavailableIds: [],
  nonDimmableIds: [],
  theme: 'glass' as const,
  wallpaper: 'dark' as const,
};

const meta = {
  title: 'Pages/Lights/Room first',
  component: DashboardStory,
  args: baseArgs,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralActiveRooms: Story = {
  play: async ({ canvasElement }) => {
    const roomToggles = canvasElement.querySelectorAll('[data-lights-room-toggle="true"]');

    await expect(roomToggles.length).toBeGreaterThan(0);
    for (const toggle of roomToggles) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
  },
};

export const AllLightsOff: Story = {
  args: {
    deviceMap: new Map(
      baseLights.map((light) => [light.id, { ...light, state: false } as DeviceWithType])
    ),
  },
};

export const MixedRoomState: Story = {};

export const UnavailableLight: Story = {
  args: { unavailableIds: ['light.kitchen_window'] },
};

export const NonDimmableRoom: Story = {
  args: {
    nonDimmableIds: ['light.hall'],
    deviceMap: new Map([['light.hall', device('light.hall', 'Hallway', 'Hall', false, 100)]]),
    rooms: ['Hall'],
    cardOrders: { Hall: ['light.hall'] },
  },
};

export const RgbLights: Story = {};

export const ColorTemperatureLights: Story = {
  args: { nonDimmableIds: [] },
};

export const ManyRooms: Story = {
  args: {
    deviceMap: new Map(
      Array.from({ length: 14 }, (_, index) => {
        const light = device(
          `light.room_${index}`,
          `Lamp ${index + 1}`,
          `Room ${index + 1}`,
          index % 3 === 0,
          20 + ((index * 9) % 80)
        );
        return [light.id, light];
      })
    ),
    rooms: Array.from({ length: 14 }, (_, index) => `Room ${index + 1}`),
    cardOrders: {},
  },
};

export const LargeHome: Story = {
  args: {
    deviceMap: new Map(largeHomeLights.map((light) => [light.id, light])),
    rooms: Object.keys(largeHomeRoomLights),
    cardOrders: {},
    unavailableIds: ['light.kitchen_1', 'light.living_room_1'],
  },
};

export const LongLightNames: Story = {
  args: {
    deviceMap: new Map([
      [
        'light.long',
        device(
          'light.long',
          'Antique reading lamp beside the north-facing library window',
          'Library',
          true,
          61
        ),
      ],
    ]),
    rooms: ['Library'],
    cardOrders: {},
  },
};

export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

export const WallTablet: Story = {
  parameters: { viewport: { defaultViewport: 'tabletLandscape' } },
};

export const IPadLandscape: Story = {
  parameters: { viewport: { defaultViewport: 'ipad12p9' } },
};

export const IPadPortrait: Story = {
  parameters: { viewport: { defaultViewport: 'ipad' } },
};

export const IPhone: Story = {
  parameters: { viewport: { defaultViewport: 'iphone14' } },
  play: async ({ canvasElement }) => {
    const summary = canvasElement.querySelector('nav');
    const roomSections = canvasElement.querySelectorAll('[data-lights-room-section]');

    await expect(summary).toHaveClass('ios-pwa-scroll-repaint');
    await expect(roomSections.length).toBeGreaterThan(0);
    for (const roomSection of roomSections) {
      await expect(roomSection).toHaveClass('ios-pwa-scroll-repaint');
    }
  },
};

export const DarkWallpaper: Story = {};

export const LightWallpaper: Story = {
  args: { theme: 'light', wallpaper: 'light' },
};

export const ReducedMotion: Story = {
  parameters: { reducedMotion: 'reduce' },
};
