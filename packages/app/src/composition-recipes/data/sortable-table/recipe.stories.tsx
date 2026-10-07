import { SortableTable as SortableTableTemplate } from '@navet/app/composition-recipes/data/sortable-table/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Data/Sortable table building block',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function TableExample() {
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>();
  const rows = [
    { id: 'kitchen', cells: { name: { primary: 'Kitchen lamp' }, room: { primary: 'Kitchen' } } },
    { id: 'desk', cells: { name: { primary: 'Desk lamp' }, room: { primary: 'Study' } } },
  ];
  if (sort)
    rows.sort(
      (a, b) =>
        a.cells.name.primary.localeCompare(b.cells.name.primary) *
        (sort.direction === 'asc' ? 1 : -1)
    );
  const columns = [
    { id: 'name', label: 'Name', sortLabel: 'Sort by name' },
    { id: 'room', label: 'Room', sortLabel: 'Sort by room', disabled: true },
  ];
  return (
    <div className="space-y-4">
      <SortableTableTemplate
        caption="Devices"
        emptyLabel="No devices"
        columns={columns}
        rows={rows}
        sort={sort}
        onSort={(column) =>
          setSort({ column, direction: sort?.direction === 'asc' ? 'desc' : 'asc' })
        }
      />
      <SortableTableTemplate
        caption="Empty devices"
        emptyLabel="No matching devices"
        columns={columns}
        rows={[]}
        onSort={() => {}}
      />
    </div>
  );
}
export const SortableTable: Story = {
  parameters: recipeDescription('sortable-table'),
  render: () => <TableExample />,
  play: async ({ canvas, userEvent }) => {
    const table = within(canvas.getByRole('table', { name: 'Devices' }));
    const sort = table.getByRole('button', { name: 'Sort by name' });
    sort.focus();
    await userEvent.keyboard('{Enter}');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    await expect(table.getAllByRole('row')[1]).toHaveTextContent('Desk lamp');
    await userEvent.keyboard(' ');
    await expect(table.getAllByRole('row')[1]).toHaveTextContent('Kitchen lamp');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    await expect(table.getByRole('button', { name: 'Sort by room' })).toBeDisabled();
    await expect(canvas.getByText('No matching devices')).toBeVisible();
  },
};
