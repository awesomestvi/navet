import { StatusFeedback as StatusFeedbackTemplate } from '@navet/app/composition-recipes/feedback/status-feedback/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Feedback/Inline operation feedback',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const StatusFeedback: Story = {
  parameters: recipeDescription('status-feedback'),
  render: () => (
    <div className="space-y-4">
      {(['loading', 'success', 'warning', 'error'] as const).map((state) => (
        <StatusFeedbackTemplate
          key={state}
          state={state}
          title={state}
          message={`Operation ${state}`}
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('status')).toHaveLength(3);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Operation error');
  },
};
