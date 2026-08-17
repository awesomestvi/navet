import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import { SummaryBar } from '@navet/app/features/sensors';
import type { ChoreOccurrence } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react';
import { ClipboardCheck } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChoreFocusCard, ChoreListItem } from './chore-card';
import { ChoreDashboardGrid } from './chore-dashboard-grid';

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
const sharedDefinition = workspace.definitionsById.hallway;
const sharedOccurrence = workspace.occurrencesById['today-hallway'];
const sharedPresentation = workspace.experience?.presentationByDefinitionId.hallway;
if (!sharedDefinition || !sharedOccurrence)
  throw new Error('Shared chore story fixture is incomplete');

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
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical chores task card built on ChoreBaseCard. Today tasks share one reading order: room and timing status, title, compact effort and reward tokens, optional instructions, then ownership and one compact footer action.',
      },
    },
  },
} satisfies Meta<typeof ChoreFocusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DueNow: Story = {
  args: {
    now: new Date(Date.parse(occurrence.dueAt) + 1),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('[data-chore-base-card]')).toBeVisible();
    const title = canvas.getByRole('heading', { name: 'Unload dishwasher' });
    await expect(title).toHaveClass('text-[12px]', 'leading-[18px]');
    await expect(title.previousElementSibling).toHaveTextContent('Kitchen · Overdue');
    await expect(canvasElement.querySelector('[data-chore-status]')).toHaveStyle({
      color: '#ef4444',
    });
    await expect(canvasElement.querySelector('[data-chore-artwork]')).not.toBeInTheDocument();
    const assignment = canvasElement.querySelector('[data-chore-assignment]');
    await expect(assignment).toBeVisible();
    await expect(assignment?.closest('footer')).toBeInTheDocument();
    await expect(canvas.getByText('Maya')).toHaveClass('text-sm', 'font-semibold');
    await expect(canvas.getByText('4 min').closest('[data-chore-header]')).toBeInTheDocument();
    await expect(canvas.getByTitle('About 4 min')).toHaveClass('h-6', 'rounded-full');
    await expect(canvas.getByTitle('15 points').closest('[data-chore-header]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-chore-focus-card]')).toHaveStyle({
      borderColor: '#ef4444',
    });
    const action = canvas.getByRole('button', { name: 'Mark done' });
    await expect(action.closest('footer')).toHaveClass('min-h-9');
    await expect(action.closest('footer')).not.toHaveClass('border-t');
    await expect(action).not.toHaveClass('border-transparent');
    await expect(action).not.toHaveClass('w-full');
    await userEvent.click(action);
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

export const ScheduledLaterToday: Story = {
  args: {
    now: new Date('2026-08-17T12:00:00'),
    occurrence: {
      ...occurrence,
      scheduledAt: '2026-08-17T18:00:00',
      dueAt: '2026-08-17T20:00:00',
    },
  },
  play: async ({ canvasElement }) => {
    const status = canvasElement.querySelector('[data-chore-status]');
    await expect(status).toHaveTextContent(/^Today · /);
    await expect(status).not.toHaveTextContent('Later');
  },
};

export const ScheduledOnAnotherDay: Story = {
  args: {
    now: new Date('2026-08-17T12:00:00'),
    occurrence: {
      ...occurrence,
      scheduledAt: '2026-08-19T18:00:00',
      dueAt: '2026-08-19T20:00:00',
    },
  },
  play: async ({ canvasElement }) => {
    const status = canvasElement.querySelector('[data-chore-status]');
    await expect(status).toHaveTextContent(/^Wed · /);
    await expect(status).not.toHaveTextContent('Later');
  },
};

export const ColorOverride: Story = {
  args: {
    occurrence: {
      ...occurrence,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    },
    presentation: { ...presentation, color: '#2563eb' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTitle('15 points')).toHaveStyle({ color: '#2563eb' });
    await expect(canvas.getByTitle('About 4 min')).toHaveStyle({ color: '#2563eb' });
  },
};

export const RoomDashboard: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="min-h-screen space-y-3 p-5">
      <SummaryBar
        items={[
          {
            id: 'chores',
            title: 'Chores',
            value: '1 remaining',
            icon: ClipboardCheck,
            iconColor: '#fb923c',
            targetSection: 'tasks',
          },
        ]}
        onNavigate={() => {}}
      />
      <ChoreDashboardGrid>
        <ChoreFocusCard {...args} />
      </ChoreDashboardGrid>
    </div>
  ),
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
    size: 'small',
    occurrence: {
      ...occurrence,
      status: 'done',
      completedBy: 'maya',
      completedAt: occurrence.scheduledAt,
    },
    action: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('[data-chore-card-size="small"]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-chore-earned-points]')).toBeVisible();
    await expect(canvas.getByTitle('15 points · Earned')).toBeVisible();
    await expect(canvas.queryByTitle('About 4 min')).not.toBeInTheDocument();
  },
};

export const ChildFriendly: Story = {
  args: { childMode: true },
};

export const WithInstructions: Story = {
  args: {
    definition: {
      ...definition,
      description: 'Empty the lower rack first, then put the cutlery away.',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Empty the lower rack first, then put the cutlery away.')
    ).toBeVisible();
  },
};

export const SharedAssignment: Story = {
  args: {
    definition: sharedDefinition,
    occurrence: sharedOccurrence,
    presentation: sharedPresentation,
    action: {
      label: 'Mark done',
      kind: 'complete',
      participantIds: sharedOccurrence.assigneeIds,
      onSelectParticipant: fn(),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTitle('Alex')).toBeInTheDocument();
    await expect(canvas.getByTitle('Maya')).toBeInTheDocument();
    await expect(canvas.getByTitle('Sam')).toBeInTheDocument();
    await expect(
      canvasElement.querySelector('[data-chore-assignment]')?.closest('footer')
    ).toHaveClass('min-h-9');
    await userEvent.click(canvas.getByRole('button', { name: 'Mark done' }));
    const menu = within(canvasElement.ownerDocument.body).getByRole('menu');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Maya' }));
    await expect(args.action?.onSelectParticipant).toHaveBeenCalledWith('maya');
  },
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const BlackTheme: Story = {
  globals: { theme: 'black' },
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
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-chore-base-card]')).toHaveLength(3);
  },
};
