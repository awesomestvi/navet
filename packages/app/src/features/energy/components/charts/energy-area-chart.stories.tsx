import type { Meta, StoryObj } from '@storybook/react';
import { EnergyAreaChart } from './energy-area-chart';

const meta = {
  title: 'Pages/Energy/Charts/Area',
  component: EnergyAreaChart,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    accentColor: '#3b82f6',
    yUnit: 'kW',
    yMax: 16,
    yTicks: [0, 4, 8, 12, 16],
    data: [
      { x: '06', y: 4 },
      { x: '09', y: 7 },
      { x: '12', y: 11 },
      { x: '15', y: 9 },
      { x: '18', y: 13 },
      { x: '21', y: 8 },
    ],
  },
} satisfies Meta<typeof EnergyAreaChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
