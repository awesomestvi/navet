import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { HassEntities } from 'home-assistant-js-websocket';
import { useEffect } from 'react';

const sampleUpsEntities: HassEntities = {
  'sensor.nutdev1_battery_charge': {
    entity_id: 'sensor.nutdev1_battery_charge',
    state: '97',
    attributes: {
      friendly_name: 'Battery charge',
      device_class: 'battery',
      unit_of_measurement: '%',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-1', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_load': {
    entity_id: 'sensor.nutdev1_load',
    state: '14',
    attributes: {
      friendly_name: 'Load',
      unit_of_measurement: '%',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-2', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_status': {
    entity_id: 'sensor.nutdev1_status',
    state: 'Online',
    attributes: {
      friendly_name: 'Status',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-3', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_status_data': {
    entity_id: 'sensor.nutdev1_status_data',
    state: 'OL',
    attributes: {
      friendly_name: 'Status data',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-4', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_input_voltage': {
    entity_id: 'sensor.nutdev1_input_voltage',
    state: '232',
    attributes: {
      friendly_name: 'Input voltage',
      unit_of_measurement: 'V',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-5', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_output_voltage': {
    entity_id: 'sensor.nutdev1_output_voltage',
    state: '230',
    attributes: {
      friendly_name: 'Output voltage',
      unit_of_measurement: 'V',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-6', parent_id: null, user_id: null },
  },
  'sensor.nutdev1_battery_runtime': {
    entity_id: 'sensor.nutdev1_battery_runtime',
    state: '1320',
    attributes: {
      friendly_name: 'Battery runtime',
      unit_of_measurement: 's',
    },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
    context: { id: 'story-ups-7', parent_id: null, user_id: null },
  },
};

type UpsStoryArgs = {
  size: CardSize;
  status: string;
};

function UpsStoryFrame({ size, status }: UpsStoryArgs) {
  useEffect(() => {
    const previousState = homeAssistantStore.getState();
    homeAssistantStore.setState({
      ...previousState,
      entities: {
        ...sampleUpsEntities,
        'sensor.nutdev1_status': {
          ...sampleUpsEntities['sensor.nutdev1_status'],
          state: status === 'OL' ? 'Online' : status === 'OB' ? 'On Battery' : status,
        },
        'sensor.nutdev1_status_data': {
          ...sampleUpsEntities['sensor.nutdev1_status_data'],
          state: status,
        },
      },
      areas: [{ area_id: 'server-room', name: 'Server Room' }],
      deviceRegistry: [{ id: 'device-ups', area_id: 'server-room', name: 'Rack UPS' }],
      entityRegistry: Object.keys(sampleUpsEntities).map((entityId) => ({
        entity_id: entityId,
        device_id: 'device-ups',
      })),
    });

    return () => {
      homeAssistantStore.setState(previousState);
    };
  }, [status]);

  return <CustomWidgetStoryFrame card={buildCustomCard('ups', size)} />;
}

const meta = {
  title: 'Cards/Custom/UPS Monitor',
  component: UpsStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    status: {
      control: 'select',
      options: ['OL', 'OB', 'LB', 'unavailable'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<UpsStoryArgs>;

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

type Story = StoryObj<UpsStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'medium',
    status: 'OL',
  },
};

export const Online: Story = {
  args: {
    size: 'medium',
    status: 'OL',
  },
};

export const OnBattery: Story = {
  args: {
    size: 'medium',
    status: 'OB',
  },
};

export const LowBattery: Story = {
  args: {
    size: 'medium',
    status: 'LB',
  },
};

export const Unavailable: Story = {
  args: {
    size: 'medium',
    status: 'unavailable',
  },
};
