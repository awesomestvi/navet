import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RoomNav } from '@/app/components/layout/room-nav';

function RoomNavStory({ isEditMode = false }: { isEditMode?: boolean }) {
  const [activeRoom, setActiveRoom] = useState('All');
  const [editMode, setEditMode] = useState(isEditMode);

  return (
    <div className="space-y-4">
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom', 'Office']}
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
    </div>
  );
}

const meta = {
  title: 'App Shell/Room Nav',
  component: RoomNavStory,
  tags: ['autodocs'],
  args: {
    isEditMode: false,
  },
} satisfies Meta<typeof RoomNavStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EditMode: Story = {
  args: {
    isEditMode: true,
  },
};
