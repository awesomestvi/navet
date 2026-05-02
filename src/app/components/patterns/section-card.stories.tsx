import type { Meta, StoryObj } from '@storybook/react';
import { SectionCard } from './section-card';

const meta = {
  title: 'Components/Patterns/Section Card',
  component: SectionCard,
  tags: ['autodocs'],
  args: {
    title: 'Section card',
    eyebrow: 'UI KIT',
    children: (
      <div className="text-sm text-white/76">Use for shared section-level content blocks.</div>
    ),
  },
} satisfies Meta<typeof SectionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
