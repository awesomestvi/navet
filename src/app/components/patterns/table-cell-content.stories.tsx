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
        component:
          'Status: proposed. Narrow text-only table cell pattern for future admin/list surfaces. Deferred decisions: selection rows, sortable headers, and action cells.',
      },
    },
  },
} satisfies Meta<typeof TableCellContentStory>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithoutSecondary: Story = { args: { secondary: undefined } };
