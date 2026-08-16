import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import type { ChoreOccurrence } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChoreFocusCard, ChoreListItem } from './chore-card';

const workspace = createChoreDemoWorkspace({
  copy: {
    dishwasher: 'Unload dishwasher',
    toys: 'Toys back home',
    hallway: 'Shoes and jackets',
    laundry: 'Fold clean laundry',
    plants: 'Water the plants',
    bins: 'Take out recycling',
    missionTitle: 'Saturday reset',
    missionDescription: 'Reset the shared spaces.',
    upcomingMissionTitle: 'Evening tidy up',
    upcomingMissionDescription: 'A quick reset before bedtime.',
    rewardTitle: 'Choose a family outing',
    secondRewardTitle: 'Build a new LEGO set',
    childDishwasher: 'Dishwasher rescue',
    childToys: 'Toys back to base',
    childHallway: 'Clear the launch pad',
    kitchen: 'Kitchen',
    bedroom: 'Bedroom',
    hallwayRoom: 'Hallway',
    livingRoom: 'Living room',
  },
});
const definition = workspace.definitionsById.dishwasher;
const occurrence = workspace.occurrencesById['today-dishwasher'];
if (!definition || !occurrence) throw new Error('Chore story fixture is incomplete');
const presentation = workspace.experience?.presentationByDefinitionId.dishwasher;

const meta = {
  title: 'Cards/Household/Chore',
  component: ChoreFocusCard,
  tags: ['autodocs'],
  args: {
    definition,
    occurrence,
    participantsById: workspace.participantsById,
    presentation,
    action: { label: 'Mark done', kind: 'complete', onSelect: fn() },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ChoreFocusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DueNow: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Mark done' }));
    await expect(args.action?.onSelect).toHaveBeenCalledOnce();
  },
};

export const Overdue: Story = {
  args: {
    occurrence: {
      ...occurrence,
      scheduledAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const AwaitingApproval: Story = {
  args: {
    occurrence: {
      ...occurrence,
      status: 'awaiting_approval',
      completedBy: 'maya',
      completedAt: occurrence.scheduledAt,
    },
    action: { label: 'Approve', kind: 'approve', onSelect: fn() },
  },
};

export const Completed: Story = {
  args: {
    occurrence: {
      ...occurrence,
      status: 'done',
      completedBy: 'maya',
      completedAt: occurrence.scheduledAt,
    },
    action: undefined,
  },
};

export const ChildFriendly: Story = {
  args: { childMode: true },
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const CompactListStates: Story = {
  render: (args) => {
    const states: ChoreOccurrence[] = [
      args.occurrence,
      { ...args.occurrence, id: 'claimed', status: 'claimed', claimedBy: 'maya' },
      {
        ...args.occurrence,
        id: 'done',
        status: 'done',
        completedBy: 'maya',
        completedAt: args.occurrence.scheduledAt,
      },
    ];
    return (
      <div className="grid w-[min(42rem,90vw)] gap-2">
        {states.map((item) => (
          <ChoreListItem
            key={item.id}
            definition={args.definition}
            occurrence={item}
            participantsById={args.participantsById}
            presentation={args.presentation}
          />
        ))}
      </div>
    );
  },
};
