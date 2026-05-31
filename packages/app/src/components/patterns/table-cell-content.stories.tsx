import type { Meta, StoryObj } from '@storybook/react';
import { TableCellContent } from './table-cell-content';

function TableCellContentStory(args: {
  primary: string;
  secondary?: string;
  align?: 'start' | 'end';
}) {
  return (
    <div className="max-w-lg rounded-[22px] border border-white/12 bg-white/6 p-4">
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <TableCellContent primary="Kitchen power" secondary="sensor.kitchen_power" />
        <TableCellContent {...args} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Table Cell Content',
  component: TableCellContentStory,
  tags: ['autodocs'],
  args: {
    primary: '412 W',
    secondary: 'Updated 2m ago',
    align: 'end',
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Text-only table-cell pattern for dense list and admin surfaces where compact scanning matters more than decorative chrome.',
          '',
          'Status: proposed.',
          '',
          'What this page covers:',
          '- Two-line value + metadata presentation for narrow tabular columns.',
          '- Single-line fallback when secondary metadata is intentionally omitted.',
          '',
          'Usage notes:',
          '- Use this pattern for status/value cells that must stay consistent across table contexts.',
          '- Keep semantic alignment (`start` or `end`) driven by column meaning, not local preference.',
          '',
          'Deferred decisions:',
          '- Selection rows',
          '- Sortable headers',
          '- Action-cell composition',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof TableCellContentStory>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Baseline two-line table cell with primary value and secondary metadata.',
      },
    },
  },
};

export const WithoutSecondary: Story = {
  args: { secondary: undefined },
  parameters: {
    docs: {
      description: {
        story: 'Single-line table cell for dense rows where supporting metadata is omitted.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
