import type { RoomWorkspaceImageReferenceV2 } from '@navet/app/features/dashboard/rooms';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RoomAppearanceDialog } from './room-appearance-dialog';
import { RoomDeleteImpactDialog } from './room-delete-impact-dialog';
import { RoomNameDialog } from './room-name-dialog';
import { ROOM_SYMBOL_ICON_CHOICES } from './room-symbol-icon';
import { RoomTargetDialog } from './room-target-dialog';

const meta = {
  title: 'Pages/Rooms/Operation dialogs',
  component: RoomNameDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    onOpenChange: () => {},
    title: 'Room operation',
    nameLabel: 'Name',
    value: '',
    onValueChange: () => {},
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  },
} satisfies Meta<typeof RoomNameDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

function CreateRoomStory() {
  const [isOpen, setIsOpen] = useState(true);
  const [name, setName] = useState('');

  return (
    <RoomNameDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Create room"
      description="Create a room in Navet and choose where it belongs."
      nameLabel="Room name"
      namePlaceholder="For example, Kitchen"
      value={name}
      onValueChange={setName}
      cancelLabel="Cancel"
      confirmLabel="Create room"
      onConfirm={() => setIsOpen(false)}
    />
  );
}

function MergeTargetStory() {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  return (
    <RoomTargetDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Merge Kitchen"
      description="Choose the room that should receive these devices and settings."
      searchLabel="Search rooms"
      searchPlaceholder="Search rooms or groups"
      targetLabel="Merge into"
      resultSummary="4 rooms"
      emptyTitle="No rooms found"
      emptyDescription="Try another search."
      candidates={[
        {
          id: 'dining-room',
          name: 'Dining room',
          groupName: 'Downstairs',
          summary: '6 devices',
        },
        {
          id: 'living-room',
          name: 'Living room',
          groupName: 'Downstairs',
          summary: '14 devices',
        },
        {
          id: 'bedroom',
          name: 'Main bedroom',
          groupName: 'Upstairs',
          summary: '8 devices',
        },
        {
          id: 'garden',
          name: 'Garden',
          summary: '5 devices',
        },
      ]}
      query={query}
      onQueryChange={setQuery}
      selectedTargetId={targetId}
      onTargetChange={setTargetId}
      cancelLabel="Cancel"
      confirmLabel="Merge rooms"
      onConfirm={() => setIsOpen(false)}
    />
  );
}

function AppearanceStory() {
  const [isOpen, setIsOpen] = useState(true);
  const [symbol, setSymbol] = useState<string | null>('CookingPot');
  const [image, setImage] = useState<RoomWorkspaceImageReferenceV2 | null>({
    kind: 'asset',
    value: 'builtin:aurora-haze-01',
  });

  return (
    <RoomAppearanceDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Room appearance"
      description="Use a symbol and image that make this room recognizable at a glance."
      symbolLabel="Room symbol"
      symbolDescription="Choose a clear symbol for navigation and compact views."
      symbolInputPlaceholder="Enter an icon name or emoji"
      symbolInputHelp="Enter a Lucide icon name or paste an emoji."
      lucideLibraryLabel="Browse Lucide icons"
      wallpaperLabel="Room image"
      wallpaperDescription="The image stays contained so room details remain easy to read."
      imagePreviewAlt="Kitchen room image"
      wallpaperOptionLabel={(id) => `Wallpaper ${id}`}
      urlLabel="Image URL"
      urlPlaceholder="https://example.com/room.jpg"
      invalidUrlMessage="Use an HTTP or HTTPS image URL."
      removeImageLabel="Remove image"
      resetLabel="Reset"
      cancelLabel="Cancel"
      confirmLabel="Apply appearance"
      symbolChoices={ROOM_SYMBOL_ICON_CHOICES.slice(0, 8).map((choice) => ({
        ...choice,
        label: choice.value,
      }))}
      symbol={symbol}
      onSymbolChange={setSymbol}
      image={image}
      onImageChange={setImage}
      onReset={() => {
        setSymbol(null);
        setImage(null);
      }}
      onConfirm={() => setIsOpen(false)}
    />
  );
}

function DeleteImpactStory() {
  const [isOpen, setIsOpen] = useState(true);
  const [destinationRoomId, setDestinationRoomId] = useState<string | null>(null);

  return (
    <RoomDeleteImpactDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Delete Kitchen?"
      description="Review where its devices will go before deleting this room."
      roomLabel="Room"
      roomName="Kitchen"
      affectedDevicesLabel="Affected devices"
      affectedDeviceCount={12}
      affectedDeviceSummary={
        destinationRoomId
          ? 'will move to Living room.'
          : 'will become unassigned in Home Assistant.'
      }
      affectedDeviceAccessibleSummary={
        destinationRoomId
          ? '12 devices will move to Living room.'
          : '12 devices will become unassigned in Home Assistant.'
      }
      destinationLabel="Move devices to"
      destinationRoomId={destinationRoomId}
      destinationFallbackLabel="Leave unassigned"
      destinations={[
        { id: 'living-room', name: 'Living room' },
        { id: 'office', name: 'Office' },
      ]}
      onDestinationChange={setDestinationRoomId}
      providerSourcesLabel="Connected systems"
      noProviderSourcesLabel="No connected room sources"
      providerSources={[
        {
          id: 'home-assistant',
          name: 'Home Assistant',
          summary: 'The linked Kitchen room will be permanently deleted from Home Assistant.',
        },
      ]}
      warningMessage="This permanently deletes Kitchen from Home Assistant. This cannot be undone."
      cancelLabel="Cancel"
      confirmLabel="Delete room"
      onConfirm={() => setIsOpen(false)}
    />
  );
}

export const CreateRoom: Story = {
  render: () => <CreateRoomStory />,
};

export const MergeTarget: Story = {
  render: () => <MergeTargetStory />,
};

export const Appearance: Story = {
  render: () => <AppearanceStory />,
};

export const DeleteImpact: Story = {
  render: () => <DeleteImpactStory />,
};
