import type { Meta, StoryObj } from '@storybook/react';
import { AddCardDialogContainer } from './container';

const demoLibraryCards = [
  {
    id: 'light.living_room',
    title: 'Living Room Main Light',
    subtitle: 'light.living_room_main',
    meta: 'Living Room',
    kind: 'device' as const,
  },
  {
    id: 'sensor.kitchen_temperature',
    title: 'Kitchen Temperature',
    subtitle: 'sensor.kitchen_temperature',
    meta: 'Kitchen',
    kind: 'device' as const,
  },
  {
    id: 'widget.quick_note',
    title: 'Quick Note',
    subtitle: 'Widget',
    meta: 'Custom',
    kind: 'widget' as const,
  },
];

const meta = {
  title: 'Dashboard/Add Card Dialog',
  component: AddCardDialogContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    onClose: () => {},
    onAddCard: () => {},
    onAddLibraryCard: () => {},
    currentRoom: 'Living Room',
    libraryCards: demoLibraryCards,
    showCardsTab: true,
  },
} satisfies Meta<typeof AddCardDialogContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WidgetsOnly: Story = {
  args: {
    showCardsTab: false,
  },
};
