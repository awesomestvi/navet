import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { HVACCard } from '@/app/features/climate';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function ClimateCardStory(args: Omit<ComponentProps<typeof HVACCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <HVACCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Climate',
  component: ClimateCardStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Alias route coverage for climate entities. Uses the HVAC card component with climate-style input data.',
      },
    },
  },
  args: {
    id: 'climate.downstairs',
    name: 'Downstairs Climate',
    room: 'Hallway',
    initialTemp: 22,
    initialCurrentTemp: 21,
    initialMode: 'cool',
    initialAction: 'cooling',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof ClimateCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Cooling: Story = {};

export const Heating: Story = {
  args: {
    initialMode: 'heat',
    initialAction: 'heating',
    initialCurrentTemp: 19,
  },
};

export const OffSmall: Story = {
  args: {
    initialState: false,
    initialMode: 'off',
    initialAction: undefined,
    size: 'small',
  },
};
