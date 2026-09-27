import { renderWithProviders } from '@navet/app/test/render';
import type { ChoreParticipant, ChoreWorkspaceData } from '@navet/core/chores';
import { act, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChoreTodayView } from './chore-today-view';

afterEach(() => vi.useRealTimers());

describe('chore Today view', () => {
  it('moves an upcoming chore into today without remounting when the clock passes midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14, 23, 59, 45));
    const scheduledAt = new Date(2026, 8, 15, 0, 10).toISOString();
    const participant: ChoreParticipant = {
      id: 'maya',
      displayName: 'Maya',
      capabilities: ['complete'],
      createdAt: scheduledAt,
      updatedAt: scheduledAt,
    };
    const data: ChoreWorkspaceData = {
      schemaVersion: 2,
      participantsById: { maya: participant },
      definitionsById: {
        bins: {
          id: 'bins',
          title: 'Take out recycling',
          enabled: true,
          assignment: { mode: 'person', participantIds: ['maya'] },
          schedule: {
            frequency: 'once',
            date: '2026-09-15',
            time: '00:10',
            timeZone: 'UTC',
          },
          dueWindowMinutes: 60,
          approval: { required: false, approverIds: [] },
          createdAt: scheduledAt,
          updatedAt: scheduledAt,
        },
      },
      occurrencesById: {
        bins: {
          id: 'bins',
          definitionId: 'bins',
          scheduledAt,
          dueAt: new Date(2026, 8, 15, 1, 10).toISOString(),
          assigneeIds: ['maya'],
          assignmentSlot: 'maya',
          status: 'available',
          updatedAt: scheduledAt,
        },
      },
      activity: [],
      outbox: [],
    };

    renderWithProviders(
      <ChoreTodayView
        data={data}
        participants={[participant]}
        selectedParticipantId="maya"
        onSelectedParticipantChange={vi.fn()}
        execute={vi.fn(async () => false)}
        onAddChore={vi.fn()}
      />
    );
    const upcoming = within(screen.getByRole('region', { name: 'Next 7 days' }));
    expect(upcoming.getByText('Take out recycling')).toBeInTheDocument();
    expect(upcoming.queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30_000));
    const today = within(screen.getByRole('region', { name: 'Needs attention' }));
    expect(today.getByText('Take out recycling')).toBeInTheDocument();
    expect(today.getByRole('button', { name: 'Mark done' })).toBeEnabled();
    expect(screen.queryByRole('region', { name: 'Next 7 days' })).not.toBeInTheDocument();
  });
});
