import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SwitchCard } from '@/app/features/lighting';
import { EntityCardStoryFrame } from '../../dashboard/stories/entity-card-story-frame';

function SwitchCardStory(args: ComponentProps<typeof SwitchCard>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <SwitchCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Switch',
  component: SwitchCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  args: {
    id: 'switch.espresso_machine',
    name: 'Espresso Machine',
    size: 'small',
    initialState: true,
    entityType: 'switch',
    serviceDomain: 'switch',
    serviceAction: 'toggle',
    isEditMode: false,
    power: 1140,
    voltage: 230,
    energy: 2.6,
  },
} satisfies Meta<typeof SwitchCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
