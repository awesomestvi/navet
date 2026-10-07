import { DashboardSection as DashboardSectionTemplate } from '@navet/app/composition-recipes/dashboard/dashboard-section/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Dashboard/Section container',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function SectionExample() {
  const [count, setCount] = useState(0);
  return (
    <div className="space-y-4">
      {(['populated', 'empty', 'unavailable'] as const).map((state) => (
        <DashboardSectionTemplate
          key={state}
          title={`Devices — ${state}`}
          state={state}
          emptyLabel="No devices selected"
          unavailableLabel="Devices unavailable"
          action={
            state === 'empty'
              ? undefined
              : { label: 'Refresh devices', onSelect: () => setCount(count + 1) }
          }
        >
          <BodyText>Refreshes: {count}</BodyText>
        </DashboardSectionTemplate>
      ))}
    </div>
  );
}
export const DashboardSection: Story = {
  parameters: recipeDescription('dashboard-section'),
  render: () => <SectionExample />,
  play: async ({ canvas, userEvent }) => {
    const actions = canvas.getAllByRole('button', { name: 'Refresh devices' });
    await expect(actions[1]).toBeDisabled();
    await userEvent.click(actions[0]);
    await expect(canvas.getByText('Refreshes: 1')).toBeVisible();
    await expect(canvas.getByText('No devices selected')).toBeVisible();
    await expect(canvas.getByText('Devices unavailable')).toBeVisible();
  },
};
