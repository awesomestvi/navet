import type { Meta, StoryObj } from '@storybook/react';
import { EnergyGauge } from './energy-gauge';

const meta = {
  title: 'Energy/Charts/Gauge',
  component: EnergyGauge,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    value: 74,
    accentColor: '#22d3ee',
    label: '74%',
    sublabel: 'battery',
  },
} satisfies Meta<typeof EnergyGauge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowValue: Story = {
  args: {
    value: 21,
    label: '21%',
  },
};
