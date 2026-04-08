import type { Meta, StoryObj } from '@storybook/react';
import { getMockEnergyOverview } from '../../data/mock-energy-dashboard';
import { EnergyConsumersWidget } from './energy-consumers-widget';

const overview = getMockEnergyOverview('day');

const meta = {
  title: 'Pages/Energy/Widgets/Consumers',
  component: EnergyConsumersWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    consumers: overview.topConsumers,
  },
} satisfies Meta<typeof EnergyConsumersWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    consumers: [],
  },
};
