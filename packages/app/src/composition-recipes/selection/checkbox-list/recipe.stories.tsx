import { CheckboxList as CheckboxListTemplate } from '@navet/app/composition-recipes/selection/checkbox-list/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Selection/Checkbox list',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function CheckboxExample() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-4">
      <CheckboxListTemplate
        label="Visible devices"
        emptyLabel="No devices"
        items={[
          { id: 'desk', label: 'Desk lamp', checked },
          {
            id: 'hall',
            label: 'Hall lamp',
            description: 'Unavailable',
            checked: true,
            disabled: true,
          },
        ]}
        onCheckedChange={(_, next) => setChecked(next)}
      />
      <CheckboxListTemplate
        label="Empty devices"
        emptyLabel="No matching devices"
        items={[]}
        onCheckedChange={() => {}}
      />
    </div>
  );
}
export const CheckboxList: Story = {
  parameters: recipeDescription('checkbox-list'),
  render: () => <CheckboxExample />,
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole('checkbox', { name: 'Desk lamp' });
    await userEvent.click(canvas.getByText('Desk lamp'));
    await expect(box).toBeChecked();
    box.focus();
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: /Hall lamp/ })).toBeDisabled();
    await expect(canvas.getByText('No matching devices')).toBeVisible();
  },
};
