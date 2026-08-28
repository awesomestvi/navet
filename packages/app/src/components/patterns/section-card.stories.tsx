import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionCard } from './section-card';

const meta = {
  title: 'Components/Patterns/Section Card',
  component: SectionCard,
  tags: ['autodocs'],
  args: {
    title: 'Kitchen climate',
    children: (
      <div className="text-sm text-current/76">21.5 °C · Humidity 46% · Air quality good</div>
    ),
  },
} satisfies Meta<typeof SectionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
