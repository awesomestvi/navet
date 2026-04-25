import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SwitchCard } from '@/app/features/lighting';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@/app/storybook/story-frames';

function ScriptCardStory(args: ComponentProps<typeof SwitchCard>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <SwitchCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Script',
  component: ScriptCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  args: {
    id: 'script.good_night',
    name: 'Good Night',
    size: 'small',
    initialState: false,
    entityType: 'script',
    serviceDomain: 'script',
    serviceAction: 'turn_on',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof ScriptCardStory>;

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

export const Tiny: Story = {
  args: {
    size: 'tiny',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
