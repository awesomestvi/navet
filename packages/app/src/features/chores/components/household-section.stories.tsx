import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import type { ChoreDefinition, ChoreOccurrence, ChoreWorkspaceData } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect, within } from 'storybook/test';
import { HouseholdSection } from './household-section';

function isoAt(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString();
}

function dateKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function fixture(mode: 'default' | 'empty' | 'approval' = 'default'): ChoreWorkspaceData {
  const createdAt = isoAt(-72);
  const participantsById =
    mode === 'empty'
      ? {}
      : {
          alex: {
            id: 'alex',
            displayName: 'Alex',
            color: '#7c8cff',
            capabilities: ['complete', 'approve', 'manage'] as const,
            createdAt,
            updatedAt: createdAt,
          },
          sam: {
            id: 'sam',
            displayName: 'Sam',
            color: '#ed7b84',
            capabilities: ['complete'] as const,
            createdAt,
            updatedAt: createdAt,
          },
        };
  const makeDefinition = (
    id: string,
    title: string,
    approverIds: string[] = []
  ): ChoreDefinition => ({
    id,
    title,
    enabled: true,
    assignment: { mode: 'person', participantIds: [id === 'plants' ? 'sam' : 'alex'] },
    schedule: {
      frequency: 'once',
      date: dateKey(isoAt(0)),
      time: '18:00',
      timeZone: 'UTC',
    },
    dueWindowMinutes: 60,
    approval: { required: approverIds.length > 0, approverIds },
    createdAt,
    updatedAt: createdAt,
  });
  const definitionsById =
    mode === 'empty'
      ? {}
      : {
          dishes: makeDefinition('dishes', 'Empty the dishwasher'),
          plants: makeDefinition('plants', 'Water the plants', ['alex']),
          bins: makeDefinition('bins', 'Take out recycling'),
        };
  const occurrence = (
    id: string,
    definitionId: string,
    assigneeId: string,
    scheduledOffset: number,
    status: ChoreOccurrence['status'] = 'available'
  ): ChoreOccurrence => ({
    id,
    definitionId,
    scheduledAt: isoAt(scheduledOffset),
    dueAt: isoAt(scheduledOffset + 1),
    assigneeIds: [assigneeId],
    assignmentSlot: assigneeId,
    status,
    completedBy: status === 'awaiting_approval' ? assigneeId : undefined,
    completedAt: status === 'awaiting_approval' ? isoAt(-1) : undefined,
    updatedAt: isoAt(-1),
  });

  return {
    schemaVersion: 1,
    participantsById,
    definitionsById,
    occurrencesById:
      mode === 'empty'
        ? {}
        : mode === 'approval'
          ? { approval: occurrence('approval', 'plants', 'sam', -2, 'awaiting_approval') }
          : {
              overdue: occurrence('overdue', 'dishes', 'alex', -4),
              upcoming: occurrence('upcoming', 'plants', 'sam', 3),
              later: occurrence('later', 'bins', 'alex', 6),
            },
    activity: [],
  };
}

function HouseholdStory({ mode = 'default' }: { mode?: 'default' | 'empty' | 'approval' }) {
  useEffect(() => {
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: fixture(mode) });
    return () => useChoreWorkspaceStore.getState().reset();
  }, [mode]);
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

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const EmptyHousehold: Story = {
  args: { mode: 'empty' },
};

export const ApprovalQueue: Story = {
  args: { mode: 'approval' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Needs approval')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  },
};

export const ChoreLibrary: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Chores' }));
    await expect(canvas.getByText('Chore library')).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 3, name: 'Empty the dishwasher' })
    ).toBeInTheDocument();
  },
};

export const DeleteChoreConfirmation: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Chores' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Empty the dishwasher' }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole('alertdialog', {
      name: 'Delete “Empty the dishwasher”?',
    });
    await expect(dialog).toBeInTheDocument();
    await expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  },
};

export const MobileChoreDialog: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Chores' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add chore' }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await expect(dialog).toBeInTheDocument();
    await expect(dialog.querySelector('button[type="submit"]')).toBeInTheDocument();
  },
};
