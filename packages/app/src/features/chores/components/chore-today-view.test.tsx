import { renderWithProviders } from '@navet/app/test/render';
import type { ChoreParticipant, ChoreWorkspaceData } from '@navet/core/chores';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChoreTodayView } from './chore-today-view';

afterEach(() => vi.useRealTimers());

describe('chore Today view', () => {
  it('shows a new-day chore without remounting when the clock passes midnight', () => {
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
    expect(screen.queryByText('Take out recycling')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText('Take out recycling')).toBeInTheDocument();
  });
});
