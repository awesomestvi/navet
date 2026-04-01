import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SwitchCard } from '@/app/features/lighting';
import { EntityCardStoryFrame } from '../../dashboard/stories/entity-card-story-frame';

function HelperCardStory(args: ComponentProps<typeof SwitchCard>) {
  return (
    <EntityCardStoryFrame>
      <SwitchCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Helper',
  component: HelperCardStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Alias route coverage for Home Assistant helper entities rendered through the switch-style interaction card.',
      },
    },
  },
  args: {
    id: 'input_boolean.guest_mode',
    name: 'Guest Mode',
    size: 'medium',
    initialState: false,
    entityType: 'helper',
    serviceDomain: 'input_boolean',
    serviceAction: 'toggle',
    isEditMode: false,
  },
} satisfies Meta<typeof HelperCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MediumOff: Story = {};

export const MediumOn: Story = {
  args: {
    initialState: true,
  },
};

export const TinyOn: Story = {
  args: {
    size: 'tiny',
    initialState: true,
  },
};
