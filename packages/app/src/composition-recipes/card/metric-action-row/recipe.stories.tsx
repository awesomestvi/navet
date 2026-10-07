import { MetricActionRow as MetricActionRowTemplate } from '@navet/app/composition-recipes/card/metric-action-row/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import { BaseCard } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Card/Metric and action layout',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function MetricExample() {
  const [active, setActive] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      {(['small', 'medium', 'large'] as const).map((size, index) => (
        <EntityCardStoryFrame key={size} size={size}>
          <BaseCard size={size} title={`Power — ${size}`}>
            <MetricActionRowTemplate
              size={size}
              value={active ? '18 W' : '0 W'}
              label="Current power"
              active={active}
              accentClassName="text-current"
              action={
                index === 2
                  ? undefined
                  : {
                      label: 'Toggle power',
                      disabled: index === 1,
                      onSelect: () => setActive(!active),
                    }
              }
            />
          </BaseCard>
        </EntityCardStoryFrame>
      ))}
    </div>
  );
}
export const MetricActionRow: Story = {
  parameters: recipeDescription('metric-action-row'),
  render: () => <MetricExample />,
  play: async ({ canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Toggle power' });
    await expect(buttons[1]).toBeDisabled();
    await userEvent.click(buttons[0]);
    await expect(canvas.getAllByText('18 W')).toHaveLength(3);
  },
};
