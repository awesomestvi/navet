import type { Meta, StoryObj } from '@storybook/react';
import { EntityRoomSelector } from './entity-room-selector';

const meta = {
  title: 'Components/Shared/Entity Room Selector',
  component: EntityRoomSelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Room assignment selector used across device settings dialogs. Reads areas from the Home Assistant registry and writes back via the HA WebSocket API. Requires a live HA connection to populate the dropdown options.',
      },
    },
  },
  argTypes: {
    compact: { control: 'boolean' },
    label: { control: 'text' },
    entityId: { control: 'text' },
  },
} satisfies Meta<typeof EntityRoomSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entityId: 'light.living_room_main',
    label: 'Room',
  },
};

export const Compact: Story = {
  args: {
    entityId: 'light.living_room_main',
    compact: true,
  },
};

export const CustomLabel: Story = {
  args: {
    entityId: 'switch.bedroom_fan',
    label: 'Assign to room',
  },
};
