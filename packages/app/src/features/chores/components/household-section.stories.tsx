import {
  type ChoreDemoFixtureMode,
  createChoreDemoWorkspace,
} from '@navet/app/features/chores/chore-demo-fixture';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { HouseholdSection } from './household-section';

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

function HouseholdStory({ mode = 'default' }: { mode?: ChoreDemoFixtureMode }) {
  useEffect(() => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({ copy: DEMO_COPY, mode }),
    });
    return () => useChoreWorkspaceStore.getState().reset();
  }, [mode]);
  return <HouseholdSection syncEnabled={false} />;
}

function HouseholdEdgeCaseStory() {
  useEffect(() => {
    const data = createChoreDemoWorkspace({ copy: DEMO_COPY });
    const createdAt = '2026-08-01T08:00:00.000Z';
    const extraParticipants = Object.fromEntries(
      ['Jordan', 'Riley', 'Taylor', 'Casey'].map((displayName) => {
        const id = displayName.toLowerCase();
        return [
          id,
          {
            id,
            displayName,
            capabilities: ['complete' as const],
            createdAt,
            updatedAt: createdAt,
          },
        ];
      })
    );
    const hallway = data.definitionsById.hallway;
    const hallwayOccurrence = data.occurrencesById['today-hallway'];
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: {
        ...data,
        participantsById: { ...data.participantsById, ...extraParticipants },
        definitionsById: hallway
          ? {
              ...data.definitionsById,
              hallway: {
                ...hallway,
                title:
                  'Put every pair of shoes, coat, backpack, and umbrella back where it belongs',
                roomRef: undefined,
                assignment: { mode: 'anyone', participantIds: [] },
              },
            }
          : data.definitionsById,
        occurrencesById: hallwayOccurrence
          ? {
              ...data.occurrencesById,
              'today-hallway': { ...hallwayOccurrence, assigneeIds: [], assignmentSlot: 'anyone' },
            }
          : data.occurrencesById,
      },
    });
    return () => useChoreWorkspaceStore.getState().reset();
  }, []);
  return <HouseholdSection syncEnabled={false} />;
}

function HouseholdRecoveryStory() {
  useEffect(() => {
    useChoreWorkspaceStore.setState({
      data: null,
      error: 'Chore data could not be read. The saved file was left unchanged.',
      recovery: {
        backupAvailable: true,
        pinConfigured: false,
        reason: 'workspace_invalid',
      },
      revision: null,
      status: 'unavailable',
    });
    return () => useChoreWorkspaceStore.getState().reset();
  }, []);
  return <HouseholdSection syncEnabled={false} />;
}

const meta = {
  title: 'Pages/Household/Today',
  component: HouseholdStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HouseholdStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const IpadProLandscape: Story = {
  globals: { viewport: { value: 'ipadPro', isRotated: true } },
  parameters: { viewport: { defaultViewport: 'ipadPro' } },
  play: async ({ canvas }) => {
    await canvas.findByText('Today at home');
    const panel = within(canvas.getByRole('tabpanel'));
    await expect(panel.getByText('House pulse')).toBeInTheDocument();
    await expect(panel.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    await expect(panel.getByText('Saturday reset')).toBeInTheDocument();
    await expect(panel.getAllByText('Kitchen').length).toBeGreaterThan(0);
  },
};

export const WideDesktop: Story = {
  globals: { viewport: { value: 'desktop1440p', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'desktop1440p' } },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await canvas.findByText('Today at home');
    const panel = within(canvas.getByRole('tabpanel'));
    await expect(panel.getByLabelText('Using this screen')).toBeInTheDocument();
    await expect(
      panel.getAllByRole('heading', { name: 'Unload dishwasher' }).length
    ).toBeGreaterThan(0);
  },
};

export const LightTheme: Story = {
  globals: { theme: 'light', viewport: { value: 'ipadPro', isRotated: true } },
  parameters: { viewport: { defaultViewport: 'ipadPro' } },
};

export const ReducedMotionKiosk: Story = {
  globals: {
    theme: 'black',
    motion: 'reduced',
    effectsQuality: 'reduced',
    viewport: { value: 'desktop1440p', isRotated: false },
  },
  parameters: { viewport: { defaultViewport: 'desktop1440p' } },
};

export const EmptyHousehold: Story = {
  args: { mode: 'empty' },
  play: async ({ canvas, canvasElement }) => {
    const welcome = await canvas.findByRole('region', {
      name: 'Set chores once. Keep the house moving.',
    });
    await expect(within(welcome).getByText('Clear ownership')).toBeInTheDocument();
    await expect(within(welcome).getByText('Useful repetition')).toBeInTheDocument();
    await expect(within(welcome).getByText('Progress your way')).toBeInTheDocument();
    const actions = within(welcome).getAllByRole('button');
    await expect(actions).toHaveLength(1);
    await userEvent.click(actions[0]);
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Set up household chores',
    });
    await expect(within(dialog).getByText('Step 1 of 6')).toBeInTheDocument();
    await expect(within(dialog).queryByLabelText('Name')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toBeVisible());
    await expect(within(dialog).queryByLabelText('Profile colour')).toBeNull();
  },
};

export const DamagedWorkspaceRecovery: Story = {
  render: () => <HouseholdRecoveryStory />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvas.getByText('Chores need attention')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Repair chores' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Start over' }));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('alertdialog', {
        name: 'Start chores over?',
      })
    ).toBeInTheDocument();
  },
};

export const HouseSettled: Story = {
  args: { mode: 'complete' },
  play: async ({ canvas }) => {
    await canvas.findByText('The house is settled');
    await expect(
      within(canvas.getByRole('tabpanel')).getByText('Everything due today is complete.')
    ).toBeInTheDocument();
  },
};

export const ChildFriendlyAdventure: Story = {
  args: { mode: 'adventure' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await canvas.findByText('Dishwasher rescue');
    await expect(
      within(canvas.getByRole('tabpanel')).getByText('Toys back to base')
    ).toBeInTheDocument();
  },
};

export const LongNameManyPeopleNoRoomAnyone: Story = {
  render: () => <HouseholdEdgeCaseStory />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const panel = within(canvas.getByRole('tabpanel'));
    await expect(
      (
        await panel.findAllByText(
          'Put every pair of shoes, coat, backpack, and umbrella back where it belongs'
        )
      ).length
    ).toBeGreaterThan(0);
    await expect(panel.getAllByText('Anyone can do it').length).toBeGreaterThan(0);
    await userEvent.click(panel.getByLabelText('Using this screen'));
    await expect(
      within(canvasElement.ownerDocument.body).getAllByRole('menuitemradio')
    ).toHaveLength(8);
    await userEvent.keyboard('{Escape}');
  },
};

export const ApprovalQueue: Story = {
  args: { mode: 'approval' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await canvas.findAllByText('Needs approval');
    const panel = within(canvas.getByRole('tabpanel'));
    await userEvent.click(panel.getByLabelText('Using this screen'));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('menuitemradio', { name: 'Alex' })
    );
    await expect(panel.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  },
};

export const ChoreLibrary: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Today at home');
    await userEvent.click(canvas.getByRole('tab', { name: 'Chores' }));
    const panel = within(canvas.getByRole('tabpanel'));
    await expect(panel.getByText('Chore library')).toBeInTheDocument();
    await expect(panel.getByRole('button', { name: 'Add chore' })).toBeInTheDocument();
    await expect(panel.getByRole('heading', { name: 'Unload dishwasher' })).toBeInTheDocument();
    await expect(panel.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0);
  },
};

export const MissionManagement: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await canvas.findByText('Today at home');
    await userEvent.click(canvas.getByRole('tab', { name: 'Missions' }));
    const panel = within(canvas.getByRole('tabpanel'));
    await expect(panel.getByText('Household missions')).toBeInTheDocument();
    await userEvent.click(panel.getByRole('button', { name: 'Add mission' }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Create mission',
    });
    await expect(dialog).toBeInTheDocument();
  },
};

export const SettingsAndRecovery: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Today at home');
    await userEvent.click(canvas.getByRole('tab', { name: 'Settings' }));
    const panel = within(canvas.getByRole('tabpanel'));
    const workspace = panel.getByRole('region', { name: 'Chore settings' });
    const navigation = within(workspace).getByRole('navigation', { name: 'Chore settings' });
    await expect(workspace).toHaveAttribute('data-chore-settings-workspace');
    await expect(
      within(navigation).getByRole('button', { name: 'Motivation style' })
    ).toHaveAttribute('aria-current', 'page');
    const motivationPanel = within(workspace).getByRole('main', { name: 'Motivation style' });
    await expect(within(motivationPanel).getByText(/Example:/)).toBeVisible();
    await userEvent.selectOptions(
      within(motivationPanel).getByRole('combobox', { name: 'Motivation style' }),
      'family'
    );
    await expect(
      within(motivationPanel).getByText(
        'Puts everyone’s points toward a shared reward. Example: reach 500 points to choose the next family outing.'
      )
    ).toBeVisible();
    await userEvent.click(within(navigation).getByRole('button', { name: 'Data and recovery' }));
    const recoveryPanel = within(workspace).getByRole('main', { name: 'Data and recovery' });
    await expect(recoveryPanel).toBeInTheDocument();
    await expect(within(workspace).getByRole('button', { name: 'Download backup' })).toBeVisible();
    await expect(
      within(recoveryPanel).queryByRole('combobox', { name: 'Motivation style' })
    ).toBeNull();
  },
};
