import type { Meta, StoryObj } from '@storybook/react';
import { CaptionValue } from './caption-value';

const meta = {
  title: 'UI/Caption Value',
  component: CaptionValue,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CaptionValue>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LeftAligned: Story = {
  args: {
    caption: 'Power',
    value: '1.2 kW',
    align: 'left',
  },
};

export const RightAligned: Story = {
  args: {
    caption: 'Updated',
    value: '2m ago',
    align: 'right',
  },
};
