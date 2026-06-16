import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { createPreviewStoryScenario, replacePreviewEntity } from '@navet/app/preview/runtime';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';

type UpsStoryArgs = {
  size: CardSize;
  status: string;
};

function UpsStoryFrame({ size }: UpsStoryArgs) {
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
  parameters: {
    previewRuntime: {
      scenario: replacePreviewEntity(createPreviewStoryScenario(), {
        id: 'home_assistant:sensor.nutdev1_status_data',
        canonicalId: 'home_assistant:sensor.nutdev1_status_data',
        providerId: 'home_assistant',
        externalId: 'sensor.nutdev1_status_data',
        type: 'sensor',
        name: 'Status data',
        room: 'Server Room',
        primaryState: 'OL',
        availability: 'available',
        attributes: {
          value: 'OL',
          room: 'Server Room',
          deviceId: 'device-ups',
        },
        capabilities: [],
        lastUpdated: '2026-05-16T08:00:00.000Z',
      }),
    },
  },
};

export const Online: Story = {
  args: {
    size: 'medium',
    status: 'OL',
  },
  parameters: Playground.parameters,
};

export const OnBattery: Story = {
  args: {
    size: 'medium',
    status: 'OB',
  },
  parameters: {
    previewRuntime: {
      scenario: replacePreviewEntity(
        replacePreviewEntity(createPreviewStoryScenario(), {
          id: 'home_assistant:sensor.nutdev1_status',
          canonicalId: 'home_assistant:sensor.nutdev1_status',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status',
          type: 'sensor',
          name: 'Status',
          room: 'Server Room',
          primaryState: 'On Battery',
          availability: 'available',
          attributes: { value: 'On Battery', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }),
        {
          id: 'home_assistant:sensor.nutdev1_status_data',
          canonicalId: 'home_assistant:sensor.nutdev1_status_data',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status_data',
          type: 'sensor',
          name: 'Status data',
          room: 'Server Room',
          primaryState: 'OB',
          availability: 'available',
          attributes: { value: 'OB', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }
      ),
    },
  },
};

export const LowBattery: Story = {
  args: {
    size: 'medium',
    status: 'LB',
  },
  parameters: {
    previewRuntime: {
      scenario: replacePreviewEntity(
        replacePreviewEntity(createPreviewStoryScenario(), {
          id: 'home_assistant:sensor.nutdev1_status',
          canonicalId: 'home_assistant:sensor.nutdev1_status',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status',
          type: 'sensor',
          name: 'Status',
          room: 'Server Room',
          primaryState: 'Low Battery',
          availability: 'available',
          attributes: { value: 'Low Battery', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }),
        {
          id: 'home_assistant:sensor.nutdev1_status_data',
          canonicalId: 'home_assistant:sensor.nutdev1_status_data',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status_data',
          type: 'sensor',
          name: 'Status data',
          room: 'Server Room',
          primaryState: 'LB',
          availability: 'available',
          attributes: { value: 'LB', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }
      ),
    },
  },
};

export const Unavailable: Story = {
  args: {
    size: 'medium',
    status: 'unavailable',
  },
  parameters: {
    previewRuntime: {
      scenario: replacePreviewEntity(
        replacePreviewEntity(createPreviewStoryScenario(), {
          id: 'home_assistant:sensor.nutdev1_status',
          canonicalId: 'home_assistant:sensor.nutdev1_status',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status',
          type: 'sensor',
          name: 'Status',
          room: 'Server Room',
          primaryState: 'unavailable',
          availability: 'unavailable',
          attributes: { value: 'unavailable', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }),
        {
          id: 'home_assistant:sensor.nutdev1_status_data',
          canonicalId: 'home_assistant:sensor.nutdev1_status_data',
          providerId: 'home_assistant',
          externalId: 'sensor.nutdev1_status_data',
          type: 'sensor',
          name: 'Status data',
          room: 'Server Room',
          primaryState: 'unavailable',
          availability: 'unavailable',
          attributes: { value: 'unavailable', room: 'Server Room', deviceId: 'device-ups' },
          capabilities: [],
          lastUpdated: '2026-05-16T08:00:00.000Z',
        }
      ),
    },
  },
};
