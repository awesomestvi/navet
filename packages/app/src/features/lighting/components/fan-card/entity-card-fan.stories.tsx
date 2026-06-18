import { FanCard } from '@navet/app/features/lighting';
import { createPreviewStoryScenario, replacePreviewEntity } from '@navet/app/preview/runtime';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function FanCardStory(args: Omit<ComponentProps<typeof FanCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <FanCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

function createFanPreviewScenario(args: {
  id: string;
  name: string;
  room: string;
  initialState?: boolean;
  initialPercentage?: number;
}) {
  const percentage = Math.max(0, Math.min(100, Math.round(args.initialPercentage ?? 0)));
  const state = args.initialState === false ? 'off' : 'on';

  return replacePreviewEntity(createPreviewStoryScenario(), {
    id: `home_assistant:${args.id}`,
    canonicalId: `home_assistant:${args.id}`,
    providerId: 'home_assistant',
    externalId: args.id,
    type: 'fan',
    name: args.name,
    room: args.room,
    primaryState: state,
    availability: 'available',
    capabilities: ['toggle', 'fan_speed'],
    lastUpdated: '2026-05-16T08:00:00.000Z',
    attributes: {
      value: state,
      percentage,
      percentage_step: 33,
      preset_modes: ['low', 'medium', 'high'],
      room: args.room,
      deviceId: 'device-bedroom-fan',
    },
  });
}

const meta = {
  title: 'Cards/Entity/Fan',
  component: FanCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
    initialPercentage: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
  args: {
    id: 'fan.bedroom_ceiling',
    name: 'Bedroom fan',
    room: 'Bedroom',
    initialState: true,
    initialPercentage: 66,
    size: 'small',
    isEditMode: false,
  },
  parameters: {
    docs: { description: {} },
    previewRuntime: {
      scenario: createFanPreviewScenario({
        id: 'fan.bedroom_ceiling',
        name: 'Bedroom fan',
        room: 'Bedroom',
        initialState: true,
        initialPercentage: 66,
      }),
    },
  },
} satisfies Meta<typeof FanCardStory>;

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

export const Medium: Story = {
  args: {
    size: 'medium',
    initialPercentage: 100,
  },
  parameters: {
    previewRuntime: {
      scenario: createFanPreviewScenario({
        id: 'fan.bedroom_ceiling',
        name: 'Bedroom fan',
        room: 'Bedroom',
        initialState: true,
        initialPercentage: 100,
      }),
    },
  },
};

export const Off: Story = {
  args: {
    initialState: false,
    initialPercentage: 0,
  },
  parameters: {
    previewRuntime: {
      scenario: createFanPreviewScenario({
        id: 'fan.bedroom_ceiling',
        name: 'Bedroom fan',
        room: 'Bedroom',
        initialState: false,
        initialPercentage: 0,
      }),
    },
  },
};

export const PresetLimited: Story = {
  args: {
    id: 'fan.preset_only_limited_fan',
    name: 'Preset Only Limited Fan',
    initialPercentage: 33,
  },
  parameters: {
    previewRuntime: {
      scenario: createFanPreviewScenario({
        id: 'fan.preset_only_limited_fan',
        name: 'Preset Only Limited Fan',
        room: 'Bedroom',
        initialState: true,
        initialPercentage: 33,
      }),
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
