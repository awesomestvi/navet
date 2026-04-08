import type { Meta, StoryObj } from '@storybook/react';
import { getMockEnergyOverview } from '../../data/mock-energy-dashboard';
import { EnergyNowWidget } from './energy-now-widget';

const overview = getMockEnergyOverview('live');

const meta = {
  title: 'Pages/Energy/Widgets/Now',
  component: EnergyNowWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    currentLoadW: overview.totals.currentLoadW,
    gridImportW: overview.totals.importW,
    trend: overview.trend,
    accentColor: '#22d3ee',
  },
} satisfies Meta<typeof EnergyNowWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowLoad: Story = {
  args: {
    currentLoadW: 980,
    gridImportW: 0,
    trend: [
      { label: 'Now', value: 0.9, timestampMs: Date.now() - 180000 },
      { label: '+15m', value: 0.8, timestampMs: Date.now() - 120000 },
      { label: '+30m', value: 0.7, timestampMs: Date.now() - 60000 },
      { label: '+45m', value: 0.6, timestampMs: Date.now() },
    ],
  },
};
