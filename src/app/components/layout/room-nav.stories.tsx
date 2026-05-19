import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RoomNav } from '@/app/components/layout/room-nav';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

const DEFAULT_ROOMS = ['Living Room', 'Kitchen', 'Bedroom', 'Office'];
const MANY_ROOMS = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Office',
  'Dining Room',
  'Hallway',
  'Laundry',
  'Guest Room',
  'Nursery',
  'Garage',
  'Patio',
  'Studio',
  'Basement',
  'Loft',
];

function RoomNavStory({
  isEditMode = false,
  rooms = DEFAULT_ROOMS,
}: {
  isEditMode?: boolean;
  rooms?: string[];
}) {
  const [activeRoom, setActiveRoom] = useState('All');
  const [editMode, setEditMode] = useState(isEditMode);

  return (
    <>
      <RoomNav
        rooms={rooms}
        activeRoom={activeRoom}
        onRoomChange={setActiveRoom}
        allViewGrouping="custom"
        isEditMode={editMode}
        onAllViewGroupingChange={() => {}}
        onToggleEditMode={() => setEditMode((value) => !value)}
        onAddEntity={() => {}}
        addEntityLabel="Add card"
      />
      <p className="text-xs opacity-70">Active room: {activeRoom}</p>
    </>
  );
}

const meta = {
  title: 'App Shell/Navigation/Room Nav',
  component: RoomNavStory,
  tags: ['autodocs'],
  args: {
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof RoomNavStory>;

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

export const Default: Story = {};

export const EditMode: Story = {
  args: {
    isEditMode: true,
  },
};

export const ManyRooms: Story = {
  args: {
    rooms: MANY_ROOMS,
  },
};
