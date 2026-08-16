import {
  getHousePulse,
  getMissionProgressList,
  getRewardProgressList,
} from '@navet/app/features/chores/chore-dashboard-selectors';
import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { HousePulse, MissionCard, RewardGoalCard } from './chore-support-cards';

const copy = {
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
};
const workspace = createChoreDemoWorkspace({ copy });
const mission = getMissionProgressList(workspace)[0];
const reward = getRewardProgressList(workspace)[0];
if (!mission || !reward) throw new Error('Chore support story fixture is incomplete');

const meta = {
  title: 'Cards/Household/Support',
  component: HousePulse,
  tags: ['autodocs'],
  args: { pulse: getHousePulse(workspace) },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Operational Household support cards. House pulse keeps identity, points, streak, completion, and the optional rewards disclosure in one row; mission and reward cards stay hidden from Today until requested and use compact milestones instead of repeated progress bars.',
      },
    },
  },
} satisfies Meta<typeof HousePulse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pulse: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('20 points')).toBeInTheDocument();
    await expect(canvas.getByText('Earned')).toBeInTheDocument();
    await expect(canvas.getByText('Day streak')).toBeInTheDocument();
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    await expect(
      canvasElement.querySelector('[data-house-pulse-layout="single-row"]')
    ).toBeVisible();

    const metrics = canvasElement.querySelectorAll('[data-pulse-metric="true"]');
    await expect(metrics).toHaveLength(3);
    for (const metric of metrics) {
      await expect(metric).toHaveClass('-my-3', 'h-[calc(100%+1.5rem)]');
      await expect(metric.querySelector('[data-pulse-metric-icon]')).toHaveClass(
        'h-7',
        'w-7',
        'sm:h-11',
        'sm:w-11'
      );
    }
  },
};

export const PulseComplete: Story = {
  args: { pulse: getHousePulse(createChoreDemoWorkspace({ copy, mode: 'complete' })) },
};

export const Mission: Story = {
  render: () => (
    <div className="max-w-sm">
      <MissionCard progress={mission} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByRole('heading', { name: 'Saturday reset' });
    await expect(title.closest('[data-chore-base-card]')).toBeVisible();
    await expect(title.previousElementSibling).toHaveTextContent('Active');
  },
};

export const Reward: Story = {
  render: () => (
    <div className="max-w-sm">
      <RewardGoalCard progress={reward} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByRole('heading', { name: 'Choose a family outing' });
    await expect(title.closest('[data-chore-base-card]')).toBeVisible();
    await expect(title.previousElementSibling).toHaveTextContent('Family goal');
  },
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const BlackTheme: Story = {
  globals: { theme: 'black' },
};
