import type { Meta, StoryObj } from '@storybook/react';
import { Flame, Lightbulb } from 'lucide-react';
import { CardHeader } from './card-header';

const meta = {
  title: 'Components/Base/Card Header',
  component: CardHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CardHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MediumWithIcon: Story = {
  args: {
    title: 'Kitchen Lamp',
    icon: <Lightbulb className="h-5 w-5" />,
    iconBgColor: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    size: 'medium',
  },
};

export const Compact: Story = {
  args: {
    title: 'Hallway',
    icon: <Flame className="h-4 w-4" />,
    iconBgColor: 'bg-red-500/20',
    iconColor: 'text-red-300',
    size: 'small',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'Read-only card',
    size: 'medium',
  },
};
