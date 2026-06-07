import { HumidifierCard } from '@navet/app/features/climate';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function HumidifierCardStory(args: Omit<ComponentProps<typeof HumidifierCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size === 'small' ? 'small' : 'medium'}>
      <HumidifierCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Humidifier',
  component: HumidifierCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
    initialTargetHumidity: {
      control: { type: 'range', min: 20, max: 80, step: 1 },
    },
    minHumidity: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
    },
    maxHumidity: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
    },
  },
  args: {
    id: 'humidifier.bedroom',
    name: 'Bedroom Humidifier',
    room: 'Bedroom',
    entityType: 'Humidifier',
    deviceClass: 'humidifier',
    initialState: true,
    initialTargetHumidity: 46,
    minHumidity: 30,
    maxHumidity: 70,
    targetHumidityStep: 1,
    initialMode: 'auto',
    availableModes: ['auto', 'eco', 'sleep'],
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof HumidifierCardStory>;

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

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Off: Story = {
  args: {
    initialState: false,
    initialMode: 'eco',
  },
};

export const Dehumidifier: Story = {
  args: {
    id: 'humidifier.basement',
    name: 'Basement Dehumidifier',
    room: 'Basement',
    entityType: 'Dehumidifier',
    deviceClass: 'dehumidifier',
    initialTargetHumidity: 52,
    minHumidity: 35,
    maxHumidity: 80,
    initialMode: 'auto',
    availableModes: ['auto', 'home', 'sleep'],
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
