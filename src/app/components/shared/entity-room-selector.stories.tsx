import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, ReactNode } from 'react';
import { RoomEyebrow } from '@/app/components/primitives/room-eyebrow';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityRoomSelector } from './entity-room-selector';

function EntityRoomSelectorPreview({ children }: { children: ReactNode }) {
  return (
    <div className="w-[22rem] rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {children}
    </div>
  );
}

function EntityRoomSelectorStory(props: ComponentProps<typeof EntityRoomSelector>) {
  return (
    <EntityRoomSelectorPreview>
      <EntityRoomSelector {...props} />
    </EntityRoomSelectorPreview>
  );
}

const meta = {
  title: 'Components/Shared/Entity Room Selector',
  component: EntityRoomSelectorStory,
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
} satisfies Meta<typeof EntityRoomSelectorStory>;

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

export const Eyebrow: Story = {
  args: {
    entityId: 'light.living_room_main',
  },
  render: () => (
    <div className="space-y-4">
      <EntityRoomSelectorPreview>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-current/50">
          Theme-aware
        </p>
        <div className="space-y-3">
          <RoomEyebrow room="Living Room" />
          <RoomEyebrow room="Bedroom" />
          <RoomEyebrow room="Kitchen" isLoading />
        </div>
      </EntityRoomSelectorPreview>
      <div className="w-88 rounded-3xl bg-linear-to-br from-orange-900/95 to-orange-950/95 p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-white/40">
          Force dark (colored dialog)
        </p>
        <div className="space-y-3">
          <RoomEyebrow room="Living Room" forceDark />
          <RoomEyebrow room="Bedroom" forceDark />
          <RoomEyebrow room="Kitchen" forceDark isLoading />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Compact eyebrow used in dialog headers to show and trigger room assignment. Theme-aware text color via surface tokens.',
      },
    },
  },
};
