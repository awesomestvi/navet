import { DashboardGrouping as DashboardGroupingTemplate } from '@navet/app/composition-recipes/dashboard/dashboard-grouping/template';
import { TabsRecipe } from '@navet/app/composition-recipes/navigation/tabs/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Diagnostics/Regression/nested-grouping',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function NestedGroupingExample() {
  const [group, setGroup] = useState('all');
  const [tab, setTab] = useState('controls');
  return (
    <DashboardGroupingTemplate
      ariaLabel="Outer groups"
      groupingLabel="Group by"
      items={[
        { id: 'all', label: 'All devices' },
        { id: 'attention', label: 'Needs attention' },
      ]}
      modes={[{ id: 'room', label: 'Room' }]}
      selectedItemId={group}
      selectedModeId="room"
      onItemChange={setGroup}
      onModeChange={() => {}}
      renderPanel={() => (
        <TabsRecipe
          label="Nested device tabs"
          value={tab}
          onValueChange={setTab}
          items={[
            { id: 'controls', label: 'Controls', content: <BodyText>Nested controls</BodyText> },
            { id: 'settings', label: 'Settings', content: <BodyText>Nested settings</BodyText> },
          ]}
        />
      )}
    />
  );
}
export const NestedGroupingTabs: Story = {
  parameters: recipeDescription('dashboard-grouping'),
  render: () => <NestedGroupingExample />,
  play: async ({ canvas, userEvent }) => {
    const outer = within(canvas.getByRole('tablist', { name: 'Outer groups' }));
    const inner = within(canvas.getByRole('tablist', { name: 'Nested device tabs' }));
    inner.getByRole('tab', { name: 'Controls' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(inner.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await expect(outer.getByRole('tab', { name: 'All devices' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(outer.getByRole('tab', { name: 'Needs attention' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
    outer.getByRole('tab', { name: 'All devices' }).focus();
    await userEvent.keyboard('{End}');
    await expect(outer.getByRole('tab', { name: 'Needs attention' })).toHaveFocus();
  },
};
