import { EmptyCard as EmptyCardTemplate } from '@navet/app/composition-recipes/card/empty-card/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Card/Empty card with optional action',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function EmptyExample() {
  const [configured, setConfigured] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      {(['small', 'medium', 'large'] as const).map((size) => (
        <EntityCardStoryFrame key={size} size={size}>
          <EmptyCardTemplate
            size={size}
            title={configured ? 'Feeds selected' : 'No feeds selected'}
            description="Choose feeds for this card"
            action={
              size === 'small'
                ? { label: 'Choose feeds', onSelect: () => setConfigured(true) }
                : undefined
            }
          />
        </EntityCardStoryFrame>
      ))}
    </div>
  );
}

export const EmptyCard: Story = {
  parameters: recipeDescription('empty-card'),
  render: () => <EmptyExample />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Choose feeds' }));
    await expect(canvas.getAllByText('Feeds selected')).toHaveLength(3);
  },
};
