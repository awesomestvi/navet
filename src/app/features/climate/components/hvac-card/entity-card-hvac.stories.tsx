import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { HVACCard } from '@/app/features/climate';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

function HVACCardStory(args: Omit<ComponentProps<typeof HVACCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <HVACCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/HVAC',
  component: HVACCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    id: 'climate.main_floor',
    name: 'Main Floor HVAC',
    room: 'Hallway',
    initialTemp: 22,
    initialCurrentTemp: 21,
    initialMode: 'cool',
    initialAction: 'cooling',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof HVACCardStory>;

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
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
