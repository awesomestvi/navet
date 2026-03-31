import type { Meta, StoryObj } from '@storybook/react';
import { getMockEnergyOverview } from '../../data/mock-energy-dashboard';
import { EnergyFlowWidget } from './energy-flow-widget';

const overview = getMockEnergyOverview('live');

const meta = {
  title: 'Energy/Widgets/Flow',
  component: EnergyFlowWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    flow: overview.flow,
    onNodeSelect: () => {},
  },
} satisfies Meta<typeof EnergyFlowWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MinimalFlow: Story = {
  args: {
    flow: [
      { id: 'solar', label: 'Solar', value: 2.2, direction: 'source', tone: 'solar' },
      { id: 'battery', label: 'Battery', value: 0.9, direction: 'storage', tone: 'battery' },
      { id: 'home', label: 'Home Load', value: 2.8, direction: 'sink', tone: 'load' },
    ],
  },
};
