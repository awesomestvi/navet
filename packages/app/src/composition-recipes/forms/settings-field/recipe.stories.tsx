import { SettingsField as SettingsFieldTemplate } from '@navet/app/composition-recipes/forms/settings-field/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Forms/Text field with validation',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function FieldExample() {
  const [value, setValue] = useState('Reading lamp');
  return (
    <div className="max-w-sm space-y-4">
      <SettingsFieldTemplate
        label="Card name"
        value={value}
        onValueChange={setValue}
        required
        hint="Use a household name"
        error={value.trim() ? undefined : 'Enter a card name'}
      />
      <SettingsFieldTemplate
        label="Room name"
        value="Living room"
        onValueChange={() => {}}
        disabled
        hint="Choose a room in settings"
      />
    </div>
  );
}

export const SettingsField: Story = {
  parameters: recipeDescription('settings-field'),
  render: () => <FieldExample />,
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByRole('textbox', { name: /Card name/ });
    const room = canvas.getByRole('textbox', { name: /Room name/ });
    await expect(name).toBeRequired();
    await expect(name).toHaveAccessibleDescription('Use a household name');
    await expect(room).toBeDisabled();
    await expect(name.id).not.toBe(room.id);
    await userEvent.click(canvas.getByText('Card name'));
    await expect(name).toHaveFocus();
    await userEvent.clear(name);
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Enter a card name');
    await userEvent.type(name, 'Desk lamp');
    await expect(name).toHaveAccessibleDescription('Use a household name');
  },
};
