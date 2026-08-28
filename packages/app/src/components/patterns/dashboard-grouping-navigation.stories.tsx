import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardGroupingNavigation } from './dashboard-grouping-navigation';

const meta = {
  title: 'Components/Patterns/Dashboard Grouping Navigation',
  component: DashboardGroupingNavigation,
  tags: ['autodocs'],
  args: {
    ariaLabel: 'Media players',
    groupingLabel: 'Group cards by',
    idPrefix: 'media-group',
    items: [
      { id: 'audio', label: 'Players & speakers' },
      { id: 'tv', label: 'TVs' },
      { id: 'receiver', label: 'Receivers' },
    ],
    modes: [
      { id: 'type', label: 'Type' },
      { id: 'room', label: 'Room' },
    ],
    selectedItemId: 'audio',
    selectedModeId: 'type',
    onItemChange: () => {},
    onModeChange: () => {},
  },
} satisfies Meta<typeof DashboardGroupingNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeGrouping: Story = {};

export const AttentionState: Story = {
  args: {
    items: [
      { id: 'speakers', label: 'Speakers', indicatorTone: 'attention' },
      { id: 'tv', label: 'TVs' },
    ],
    selectedItemId: 'speakers',
  },
};

export const Phone: Story = {
  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
};
