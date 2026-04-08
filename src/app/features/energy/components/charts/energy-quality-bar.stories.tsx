import type { Meta, StoryObj } from '@storybook/react';
import { EnergyQualityBar } from './energy-quality-bar';

const meta = {
  title: 'Pages/Energy/Charts/Quality Bar',
  component: EnergyQualityBar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    value: 68,
    accentColor: '#22d3ee',
    label: 'quality score',
  },
} satisfies Meta<typeof EnergyQualityBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Poor: Story = {
  args: {
    value: 24,
  },
};
