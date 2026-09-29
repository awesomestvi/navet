import { installDemoChoreActions } from '@navet/app/demo/demo-chore-actions';
import { DeviceGrid } from '@navet/app/features/dashboard/device-grid';
import { buildRoomStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useI18n } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getChoreTiming } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { getRoomTodayChores } from '../chore-dashboard-selectors';
import { type ChoreDemoFixtureMode, createChoreDemoWorkspace } from '../chore-demo-fixture';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import RoomChoresSheet from './room-chores-sheet';

const DEMO_COPY = {
  dishwasher: 'Unload dishwasher',
  toys: 'Toys back home',
  hallway: 'Shoes and jackets',
  laundry: 'Fold clean laundry',
  plants: 'Water the plants',
  bins: 'Take out recycling',
  missionTitle: 'Saturday reset',
  missionDescription: 'Make the shared spaces feel calm for the weekend.',
  upcomingMissionTitle: 'Evening tidy up',
  upcomingMissionDescription: 'A quick reset before bedtime.',
  rewardTitle: 'Choose our next family outing',
  secondRewardTitle: 'Build a new LEGO set',
  childDishwasher: 'Dishwasher rescue',
  childToys: 'Toys back to base',
  childHallway: 'Clear the launch pad',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  hallwayRoom: 'Hallway',
  livingRoom: 'Living room',
};

const deviceMap = new Map<string, DeviceWithType>([
  [
    'climate.kitchen',
    {
      id: 'climate.kitchen',
      type: 'climate',
      name: 'Kitchen thermostat',
      room: 'Kitchen',
      temperature: 21,
      currentTemperature: 20,
      mode: 'heat',
      size: 'small',
    },
  ],
  [
    'light.kitchen',
    {
      id: 'light.kitchen',
      type: 'lights',
      name: 'Kitchen lights',
      room: 'Kitchen',
      state: true,
      temp: 3000,
      brightness: 75,
      size: 'small',
    },
  ],
]);

function RoomChoresStory({
  mode = 'default',
  room = 'Kitchen',
  failure = false,
}: {
  mode?: ChoreDemoFixtureMode;
  room?: string;
  failure?: boolean;
}) {
  const { t } = useI18n();
  const [now] = useState(() => new Date(2026, 8, 29, 12));
  const [open, setOpen] = useState(false);
  const data = useChoreWorkspaceStore((state) => state.data);
  useEffect(() => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({ copy: { ...DEMO_COPY, kitchen: room }, now, mode }),
    });
    if (failure)
      useChoreWorkspaceStore.setState({
        data: null,
        status: 'error',
        error: 'Chores could not be loaded.',
      });
    const restore = installDemoChoreActions();
    return () => {
      restore();
      useChoreWorkspaceStore.getState().reset();
    };
  }, [now, mode, room, failure]);
  const pending = data
    ? getRoomTodayChores(data, { label: room }, now).filter(
        (occurrence) => occurrence.status !== 'done'
      )
    : [];
  const items = buildRoomStatusSummaryItems(
    deviceMap,
    'Kitchen',
    {
      pendingChoreCount: pending.length,
      overdueChoreCount: pending.filter(
        (occurrence) => getChoreTiming(occurrence, now) === 'overdue'
      ).length,
    },
    t
  ).map((item) =>
    item.id === 'chores'
      ? { ...item, value: data ? item.value : t('common.loading'), onSelect: () => setOpen(true) }
      : item
  );
  return (
    <SummaryBarStack>
      <SummaryBar items={items} singleRow onNavigate={() => {}} />
      <div data-testid="room-device-grid">
        <DeviceGrid
          orderedCardIds={['climate.kitchen', 'light.kitchen']}
          deviceMap={deviceMap}
          isEditMode={false}
          cardSizes={{}}
          updateCardSize={() => {}}
        />
      </div>
      {open ? (
        <RoomChoresSheet
          room={room}
          data={data}
          occurrences={pending}
          now={now}
          onOpenChange={setOpen}
        />
      ) : null}
    </SummaryBarStack>
  );
}

const meta = {
  title: 'Pages/Household/Room chores',
  component: RoomChoresStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Room chores use a fixed-height summary row and a focused sheet, preserving the positions of everyday device controls.',
      },
    },
  },
  render: (args) => <RoomChoresStory {...args} />,
} satisfies Meta<typeof RoomChoresStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Due: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grid = canvas.getByTestId('room-device-grid');
    const before = grid.getBoundingClientRect();
    await userEvent.click(await canvas.findByRole('button', { name: 'Open Chores' }));
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog');
    await expect(within(dialog).getByText('Unload dishwasher')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark done' }));
    await expect(await within(dialog).findByText('Nothing needs doing today')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await expect(canvas.getByText('All done today')).toBeInTheDocument();
    const after = grid.getBoundingClientRect();
    await expect(after.y).toBe(before.y);
    await expect(after.height).toBe(before.height);
  },
};
export const AllDone: Story = {
  args: { mode: 'complete' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Open Chores' }));
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog');
    await expect(within(dialog).getByText('Nothing needs doing today')).toBeInTheDocument();
  },
};
export const LoadError: Story = {
  args: { failure: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: 'Open Chores' })
    );
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog');
    await expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Chores could not be loaded.'
    );
    await expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  },
};
export const LongRoomName: Story = {
  args: { room: 'Kitchen and breakfast room overlooking the garden' },
};
