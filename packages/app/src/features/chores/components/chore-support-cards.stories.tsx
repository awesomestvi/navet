import {
  getHousePulse,
  getMissionProgressList,
  getRewardProgressList,
} from '@navet/app/features/chores/chore-dashboard-selectors';
import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
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
          'Operational Household support cards. House pulse pairs identity with primary actions, then keeps metrics in a dedicated row on landscape displays and a safer wrapped grid on portrait tablets and phones; mission and reward cards stay hidden from Today until requested and use compact milestones instead of repeated progress bars.',
      },
    },
  },
} satisfies Meta<typeof HousePulse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pulse: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: '1, Overdue' })).toBeInTheDocument();
    await expect(canvas.queryByText('20 points')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Earned')).not.toBeInTheDocument();
    await expect(canvas.getByText('Day streak')).toBeInTheDocument();
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    await expect(
      canvasElement.querySelector('[data-house-pulse-layout="responsive"]')
    ).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Needs attention' })).toHaveClass(
      'text-sm',
      'leading-tight'
    );
    await expect(canvasElement.querySelector('[data-house-pulse-icon="true"]')).toHaveClass(
      'h-8',
      'w-8',
      'xl:h-9',
      'xl:w-9'
    );
    await expect(canvasElement.querySelector('[data-house-pulse-header="true"]')).toHaveClass(
      'pb-3'
    );
    await expect(canvasElement.querySelector('[data-house-pulse-metrics="true"]')).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:landscape:grid-cols-3',
      'xl:grid-cols-3'
    );

    const metrics = canvasElement.querySelectorAll('[data-pulse-metric="true"]');
    await expect(metrics).toHaveLength(3);
    for (const metric of metrics) {
      await expect(metric).toHaveClass('min-h-14', 'py-3.5', 'xl:py-3.5');
      await expect(metric.querySelector('[data-pulse-metric-icon]')).toHaveClass(
        'h-8',
        'w-8',
        'xl:h-9',
        'xl:w-9'
      );
    }
    await expect(metrics[0]).toHaveClass('lg:landscape:pl-5', 'xl:pl-5');
    await expect(metrics[2]).toHaveClass('sm:col-span-2', 'xl:col-span-1');
  },
};

export const PulseCurrent: Story = {
  args: {
    pulse: {
      ...getHousePulse(workspace),
      overdue: 0,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'House pulse' })).toBeInTheDocument();
    await expect(canvas.getByText('20 points')).toBeInTheDocument();
    await expect(canvas.getByText('Earned')).toBeInTheDocument();
    await expect(canvas.queryByText('Overdue')).not.toBeInTheDocument();
  },
};

export const LandscapeTablet: Story = {
  args: { onSeeRewards: () => undefined },
  globals: { viewport: { value: 'ipadMini', isRotated: true } },
  parameters: {
    docs: {
      description: {
        story:
          'Short landscape tablets keep all metrics in one compact second row so the first chore remains visible without scrolling.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const metrics = canvasElement.querySelectorAll('[data-pulse-metric="true"]');
    await expect(metrics).toHaveLength(4);
    await expect(canvasElement.querySelector('[data-house-pulse-metrics="true"]')).toHaveClass(
      'lg:landscape:grid-cols-4'
    );
    for (const metric of metrics) {
      await expect(metric).toHaveClass('lg:landscape:min-h-14');
    }
  },
};

export const PortraitTablet: Story = {
  args: { onSeeRewards: () => undefined },
  globals: { viewport: { value: 'ipadPro', isRotated: false } },
  parameters: {
    docs: {
      description: {
        story:
          'At portrait tablet width, House pulse keeps its identity separate and gives each summary metric enough room in a balanced two-column grid.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const metrics = canvasElement.querySelectorAll('[data-pulse-metric="true"]');
    await expect(metrics).toHaveLength(4);
    await expect(canvasElement.querySelector('[data-house-pulse-metrics="true"]')).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:landscape:grid-cols-4',
      'xl:grid-cols-4'
    );
    await expect(metrics[1]).toHaveClass('sm:border-l');
    await expect(metrics[3]).toHaveClass('sm:border-l');
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
