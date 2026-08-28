import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatteryMedium } from 'lucide-react';
import { CompactMeterListItem } from './compact-meter-list-item';

const meta = {
  title: 'Components/Patterns/Compact Meter List Item',
  component: CompactMeterListItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl rounded-[24px] border border-white/10 bg-zinc-950 p-5 text-white">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Kitchen battery',
    value: '68%',
    level: 68,
    color: '#f59e0b',
    subtleFill: 'rgba(255,255,255,0.1)',
    textSecondary: 'text-white/70',
    leading: <BatteryMedium className="h-4 w-4 text-amber-300" aria-hidden="true" />,
  },
} satisfies Meta<typeof CompactMeterListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {};

export const Fluid: Story = {
  args: {
    label: 'Main floor heating loop',
    value: '3.6 kW',
    level: 72,
    color: '#38bdf8',
    layout: 'fluid',
  },
};

export const ValueOnly: Story = {
  args: {
    label: 'Solar production',
    value: '4.2 kW',
    level: 84,
    color: '#facc15',
    isCompact: true,
  },
};
