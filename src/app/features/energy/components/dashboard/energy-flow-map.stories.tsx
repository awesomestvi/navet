import type { Meta, StoryObj } from '@storybook/react';
import { getEnergyDashboardScenario } from '../../data/mock-energy-dashboard';
import { EnergyFlowMap } from './energy-flow-map';

const scenario = getEnergyDashboardScenario('default').dashboard;

const meta = {
  title: 'Pages/Energy/Dashboard/Flow Map',
  component: EnergyFlowMap,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    nodes: scenario.nodes,
    flows: scenario.flows,
    selectedNodeId: 'home',
    onNodeSelect: () => {},
    staticBeams: false,
  },
} satisfies Meta<typeof EnergyFlowMap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    consumers: scenario.topConsumers,
  },
};

export const StaticFallback: Story = {
  args: {
    consumers: scenario.topConsumers,
    staticBeams: true,
  },
};
