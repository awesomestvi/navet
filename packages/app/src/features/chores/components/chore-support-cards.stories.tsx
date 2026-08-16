import {
  getHousePulse,
  getMissionProgressList,
  getRewardProgressList,
  getRoomChoreSummaries,
} from '@navet/app/features/chores/chore-dashboard-selectors';
import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import type { Meta, StoryObj } from '@storybook/react';
import {
  HousePulse,
  MissionCard,
  RewardGoalCard,
  RoomChoreSummaryCard,
} from './chore-support-cards';

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
const rooms = getRoomChoreSummaries(workspace);
const mission = getMissionProgressList(workspace)[0];
const reward = getRewardProgressList(workspace)[0];
if (!mission || !reward) throw new Error('Chore support story fixture is incomplete');

const meta = {
  title: 'Cards/Household/Support',
  component: HousePulse,
  tags: ['autodocs'],
  args: { pulse: getHousePulse(workspace), rooms },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HousePulse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pulse: Story = {};

export const PulseComplete: Story = {
  args: { pulse: getHousePulse(createChoreDemoWorkspace({ copy, mode: 'complete' })) },
};

export const RoomSummary: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
      {rooms.slice(0, 3).map((room) => (
        <RoomChoreSummaryCard key={room.canonicalId} summary={room} onSelect={() => {}} />
      ))}
    </div>
  ),
};

export const Mission: Story = {
  render: () => (
    <div className="max-w-sm">
      <MissionCard progress={mission} />
    </div>
  ),
};

export const Reward: Story = {
  render: () => (
    <div className="max-w-sm">
      <RewardGoalCard progress={reward} />
    </div>
  ),
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};
