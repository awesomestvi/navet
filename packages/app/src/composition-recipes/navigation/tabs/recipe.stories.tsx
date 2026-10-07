import { TabsRecipe } from '@navet/app/composition-recipes/navigation/tabs/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Navigation/Controlled tabs',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function TabsExample() {
  const [value, setValue] = useState('controls');
  return (
    <TabsRecipe
      label="Device pages"
      value={value}
      onValueChange={setValue}
      items={[
        { id: 'controls', label: 'Controls', content: <BodyText>Everyday controls</BodyText> },
        {
          id: 'unsupported',
          label: 'History unavailable',
          disabled: true,
          content: <BodyText>Unavailable history</BodyText>,
        },
        { id: 'settings', label: 'Settings', content: <BodyText>Configuration</BodyText> },
      ]}
    />
  );
}
export const Tabs: Story = {
  parameters: recipeDescription('tabs'),
  render: () => <TabsExample />,
  play: async ({ canvas, userEvent }) => {
    const controls = canvas.getByRole('tab', { name: 'Controls' });
    controls.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Configuration');
    await expect(canvas.getByRole('tab', { name: 'History unavailable' })).toBeDisabled();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(controls).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Everyday controls');
  },
};
