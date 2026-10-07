import { DashboardGrouping as DashboardGroupingTemplate } from '@navet/app/composition-recipes/dashboard/dashboard-grouping/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Dashboard/Grouping navigation',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function GroupingExample() {
  const [mode, setMode] = useState('room');
  const [item, setItem] = useState('all');
  return (
    <div className="space-y-4">
      <DashboardGroupingTemplate
        ariaLabel="Device groups"
        groupingLabel="Group by"
        items={[
          { id: 'all', label: 'All devices' },
          { id: 'attention', label: 'Needs attention', indicatorTone: 'attention' },
        ]}
        modes={[
          { id: 'room', label: 'Room' },
          { id: 'type', label: 'Type' },
        ]}
        selectedItemId={item}
        selectedModeId={mode}
        onItemChange={setItem}
        onModeChange={setMode}
        renderPanel={(id) => (
          <BodyText>
            {mode}: {id}
          </BodyText>
        )}
      />
      <DashboardGroupingTemplate
        ariaLabel="No grouping"
        groupingLabel="Group by"
        items={[]}
        modes={[]}
        selectedItemId=""
        selectedModeId=""
        onItemChange={() => {}}
        onModeChange={() => {}}
        renderPanel={() => null}
      />
    </div>
  );
}
export const DashboardGrouping: Story = {
  parameters: recipeDescription('dashboard-grouping'),
  render: () => <GroupingExample />,
  play: async ({ canvas, userEvent }) => {
    const all = canvas.getByRole('tab', { name: 'All devices' });
    all.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Needs attention' })).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('room: attention');
    await userEvent.keyboard('{Home}');
    await expect(all).toHaveFocus();
    const launcher = canvas.getByRole('button', { name: 'Group by: Room' });
    await userEvent.click(launcher);
    await userEvent.click(
      await within(document.body).findByRole('menuitemradio', { name: 'Type' })
    );
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('type: all');
    await waitFor(() => expect(launcher).toHaveFocus());
  },
};
