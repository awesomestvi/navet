import type { Meta, StoryObj } from '@storybook/react';
import type { HassEntities } from 'home-assistant-js-websocket';
import { useEffect } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const sampleBatteryEntities: HassEntities = {
  'sensor.front_door_sensor_battery': {
    entity_id: 'sensor.front_door_sensor_battery',
    state: '18',
    attributes: {
      friendly_name: 'Front Door Sensor',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: '2026-04-09T08:00:00+00:00',
    last_updated: '2026-04-09T08:00:00+00:00',
    context: { id: 'story-battery-1', parent_id: null, user_id: null },
  },
  'sensor.kitchen_remote_battery': {
    entity_id: 'sensor.kitchen_remote_battery',
    state: '42',
    attributes: {
      friendly_name: 'Kitchen Remote',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: '2026-04-09T08:00:00+00:00',
    last_updated: '2026-04-09T08:00:00+00:00',
    context: { id: 'story-battery-2', parent_id: null, user_id: null },
  },
  'sensor.living_room_motion_battery': {
    entity_id: 'sensor.living_room_motion_battery',
    state: '67',
    attributes: {
      friendly_name: 'Living Room Motion',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: '2026-04-09T08:00:00+00:00',
    last_updated: '2026-04-09T08:00:00+00:00',
    context: { id: 'story-battery-3', parent_id: null, user_id: null },
  },
  'sensor.thermostat_battery': {
    entity_id: 'sensor.thermostat_battery',
    state: '91',
    attributes: {
      friendly_name: 'Hall Thermostat',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: '2026-04-09T08:00:00+00:00',
    last_updated: '2026-04-09T08:00:00+00:00',
    context: { id: 'story-battery-4', parent_id: null, user_id: null },
  },
};

type BatteryOverviewStoryArgs = {
  size: CardSize;
};

function BatteryOverviewStoryFrame({ size }: BatteryOverviewStoryArgs) {
  useEffect(() => {
    const previousEntities = homeAssistantStore.getState().entities;
    homeAssistantStore.setState({ entities: sampleBatteryEntities });

    return () => {
      homeAssistantStore.setState({ entities: previousEntities });
    };
  }, []);

  return <CustomWidgetStoryFrame card={buildCustomCard('battery', size)} />;
}

const meta = {
  title: 'Cards/Custom/Battery Overview',
  component: BatteryOverviewStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<BatteryOverviewStoryArgs>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<BatteryOverviewStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};
