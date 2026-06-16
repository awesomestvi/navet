import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { createPreviewStoryScenario, replacePreviewEntity } from '@navet/app/preview/runtime';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';

type MapStoryArgs = {
  size: CardSize;
};

function MapStoryFrame({ size }: MapStoryArgs) {
  return <CustomWidgetStoryFrame card={buildCustomCard('map', size)} />;
}

function MapEmptyStoryFrame({ size }: MapStoryArgs) {
  return <CustomWidgetStoryFrame card={buildCustomCard('map', size)} />;
}

const meta = {
  title: 'Cards/Custom/Map',
  component: MapStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<MapStoryArgs>;

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

type Story = StoryObj<MapStoryArgs>;

export const Playground: Story = {
  args: { size: 'medium' },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Medium: Story = {
  args: { size: 'medium' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const EmptyState: Story = {
  name: 'Empty State (no GPS)',
  render: (args) => <MapEmptyStoryFrame {...args} />,
  args: { size: 'medium' },
  parameters: {
    previewRuntime: {
      scenario: replacePreviewEntity(createPreviewStoryScenario(), {
        id: 'home_assistant:person.alice',
        canonicalId: 'home_assistant:person.alice',
        providerId: 'home_assistant',
        externalId: 'person.alice',
        type: 'person',
        name: 'Alice',
        room: 'Home',
        primaryState: 'home',
        availability: 'available',
        attributes: {
          value: 'home',
          location: 'Home',
          room: 'Home',
          deviceId: 'device-person-alice',
        },
        capabilities: [],
        lastUpdated: '2026-05-16T08:00:00.000Z',
      }),
    },
  },
};
