import type { Meta, StoryObj } from '@storybook/react';
import { SurfacePanel } from './surface-panel';

const meta = {
  title: 'Components/Primitives/Surface Panel',
  component: SurfacePanel,
  tags: ['autodocs'],
  args: {
    children: <div className="text-sm text-white/80">Shared panel content</div>,
  },
} satisfies Meta<typeof SurfacePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = {
  args: {
    variant: 'muted',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    withSheen: true,
  },
};
