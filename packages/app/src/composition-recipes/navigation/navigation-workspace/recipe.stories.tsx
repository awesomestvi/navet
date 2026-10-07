import { NavigationWorkspaceRecipe } from '@navet/app/composition-recipes/navigation/navigation-workspace/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Navigation/Sidebar workspace',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function WorkspaceExample() {
  const [selected, setSelected] = useState('room');
  return (
    <NavigationWorkspaceRecipe
      label="Settings workspace"
      selectedId={selected}
      onSelect={setSelected}
      items={[
        { id: 'room', label: 'Rooms', content: <BodyText>Room settings</BodyText> },
        {
          id: 'appearance',
          label: 'Appearance',
          content: <BodyText>Appearance settings</BodyText>,
        },
        {
          id: 'provider',
          label: 'Provider unavailable',
          disabled: true,
          content: <BodyText>Provider settings</BodyText>,
        },
      ]}
    />
  );
}
export const NavigationWorkspace: Story = {
  parameters: recipeDescription('navigation-workspace'),
  render: () => <WorkspaceExample />,
  play: async ({ canvas, userEvent }) => {
    const appearance = canvas.getByRole('button', { name: 'Appearance' });
    appearance.focus();
    await userEvent.keyboard('{Enter}');
    await expect(appearance).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getByText('Appearance settings')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Provider unavailable' })).toBeDisabled();
  },
};
