import { SettingsSection as SettingsSectionTemplate } from '@navet/app/composition-recipes/forms/settings-section/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Forms/Text field group',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function SettingsSectionExample() {
  const [value, setValue] = useState('Lamp');
  return (
    <SettingsSectionTemplate
      title="Appearance"
      description="Names used in this household"
      fields={[
        {
          key: 'name',
          label: 'Display name',
          value,
          onValueChange: setValue,
          required: true,
          hint: 'Choose a household name',
          error: value.trim() ? undefined : 'Enter a display name',
        },
        {
          key: 'room',
          label: 'Assigned room',
          value: 'Living room',
          onValueChange: () => {},
          disabled: true,
        },
      ]}
    />
  );
}
export const SettingsSection: Story = {
  parameters: recipeDescription('settings-section'),
  render: () => <SettingsSectionExample />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: /Display name/ });
    await userEvent.click(canvas.getByText('Display name'));
    await expect(input).toHaveFocus();
    await expect(input).toBeRequired();
    await expect(canvas.getByRole('textbox', { name: 'Assigned room' })).toBeDisabled();
    await userEvent.clear(input);
    await expect(input).toHaveAccessibleDescription('Enter a display name');
    await userEvent.type(input, 'Desk');
    await expect(input).toHaveAccessibleDescription('Choose a household name');
  },
};
