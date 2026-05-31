import type { Meta, StoryObj } from '@storybook/react';
import { EnergyBarChart } from './energy-bar-chart';

const meta = {
  title: 'Pages/Energy/Charts/Bar',
  component: EnergyBarChart,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    accentColor: '#f97316',
    data: [
      { label: 'Mon', value: 18, unit: 'kWh' },
      { label: 'Tue', value: 22, unit: 'kWh' },
      { label: 'Wed', value: 16, unit: 'kWh' },
      { label: 'Thu', value: 29, unit: 'kWh', alert: true },
      { label: 'Fri', value: 20, unit: 'kWh' },
    ],
  },
} satisfies Meta<typeof EnergyBarChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AlertHeavy: Story = {
  args: {
    data: [
      { label: 'A', value: 24, unit: '%', alert: true },
      { label: 'B', value: 17, unit: '%', alert: false },
      { label: 'C', value: 31, unit: '%', alert: true },
      { label: 'D', value: 12, unit: '%', alert: false },
    ],
  },
};
