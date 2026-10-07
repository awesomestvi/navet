import { SearchableSelection as SearchableSelectionTemplate } from '@navet/app/composition-recipes/selection/searchable-selection/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Selection/Searchable selection',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const selectionOptions = [
  { id: 'desk', label: 'Desk lamp' },
  { id: 'hall', label: 'Hall lamp — unavailable', disabled: true },
  { id: 'kitchen', label: 'Kitchen ceiling lamp with a long household name' },
];
function SelectionExample() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  return (
    <div className="max-w-md space-y-4">
      <SearchableSelectionTemplate
        label="Search devices"
        query={query}
        onQueryChange={setQuery}
        options={selectionOptions.filter((option) =>
          option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        )}
        selectedId={selected}
        onSelect={(id) => {
          setSelected(id);
          setQuery(selectionOptions.find((option) => option.id === id)?.label ?? '');
        }}
        emptyLabel="No matching devices"
      />
      <SearchableSelectionTemplate
        label="Disabled search"
        query=""
        onQueryChange={() => {}}
        options={[]}
        onSelect={() => {}}
        emptyLabel="No devices"
        disabled
      />
      <BodyText>Selected: {selected ?? 'None'}</BodyText>
      <Button variant="soft">Next control</Button>
    </div>
  );
}
export const SearchableSelection: Story = {
  parameters: recipeDescription('searchable-selection'),
  render: () => <SelectionExample />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('combobox', { name: 'Search devices' });
    await expect(canvas.getByRole('combobox', { name: 'Disabled search' })).toBeDisabled();
    await userEvent.click(input);
    await expect(canvas.getByRole('option', { name: /Hall lamp/ })).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(canvas.getByText('Selected: kitchen')).toBeVisible();
    await expect(input).toHaveFocus();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.clear(input);
    await userEvent.type(input, 'not present');
    await expect(canvas.getByText('No matching devices')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.clear(input);
    await userEvent.type(input, 'Desk');
    await userEvent.click(canvas.getByRole('option', { name: 'Desk lamp' }));
    await expect(canvas.getByText('Selected: desk')).toBeVisible();
    await userEvent.click(input);
    await userEvent.tab();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  },
};
