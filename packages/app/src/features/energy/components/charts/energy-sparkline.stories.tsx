import type { Meta, StoryObj } from '@storybook/react';
import { EnergySparkline } from './energy-sparkline';

const now = Date.now();

const meta = {
  title: 'Pages/Energy/Charts/Sparkline',
  component: EnergySparkline,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    accentColor: '#22d3ee',
    data: [
      { value: 910, timestampMs: now - 5 * 60_000 },
      { value: 1220, timestampMs: now - 4 * 60_000 },
      { value: 980, timestampMs: now - 3 * 60_000 },
      { value: 1310, timestampMs: now - 2 * 60_000 },
      { value: 1170, timestampMs: now - 60_000 },
      { value: 1060, timestampMs: now },
    ],
    height: 56,
  },
} satisfies Meta<typeof EnergySparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithYAxisMarks: Story = {
  args: {
    showYAxisMarks: true,
  },
};
