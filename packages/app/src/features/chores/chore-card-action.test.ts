import type { TranslateFn } from '@navet/app/i18n';
import type { ChoreDefinition, ChoreOccurrence, ChoreWorkspaceAction } from '@navet/core/chores';
import { describe, expect, it, vi } from 'vitest';
import { getChoreCardAction } from './chore-card-action';

const t = ((key: string) => key) as TranslateFn;
const definition: ChoreDefinition = {
  id: 'hallway',
  title: 'Shoes and jackets',
  enabled: true,
  assignment: { mode: 'everyone', participantIds: ['alex', 'maya', 'sam'] },
  schedule: {
    frequency: 'daily',
    startDate: '2026-08-17',
    time: '18:00',
    timeZone: 'Europe/Stockholm',
  },
  dueWindowMinutes: 120,
  approval: { required: false, approverIds: [] },
  createdAt: '2026-08-17T08:00:00.000Z',
  updatedAt: '2026-08-17T08:00:00.000Z',
};
const occurrence: ChoreOccurrence = {
  id: 'today-hallway',
  definitionId: definition.id,
  scheduledAt: '2026-08-17T16:00:00.000Z',
  dueAt: '2026-08-17T18:00:00.000Z',
  assigneeIds: ['alex', 'maya', 'sam'],
  assignmentSlot: 'everyone',
  status: 'available',
  updatedAt: '2026-08-17T08:00:00.000Z',
};

describe('getChoreCardAction', () => {
  it('keeps Mark done available in Everyone view and attributes it to the chosen person', () => {
    const execute = vi
      .fn<(action: ChoreWorkspaceAction) => Promise<boolean>>()
      .mockResolvedValue(true);
    const action = getChoreCardAction(occurrence, definition, 'all', execute, t);

    expect(action).toMatchObject({
      label: 'household.actions.complete',
      kind: 'complete',
      participantIds: ['alex', 'maya', 'sam'],
    });

    action?.onSelectParticipant?.('maya');

    expect(execute).toHaveBeenCalledWith({
      type: 'occurrence_action',
      occurrenceId: occurrence.id,
      action: { type: 'complete', participantId: 'maya' },
    });
  });

  it('attributes a claimed chore directly to its claimant in Everyone view', () => {
    const execute = vi
      .fn<(action: ChoreWorkspaceAction) => Promise<boolean>>()
      .mockResolvedValue(true);
    const action = getChoreCardAction(
      { ...occurrence, status: 'claimed', claimedBy: 'sam' },
      definition,
      'all',
      execute,
      t
    );

    expect(action?.participantIds).toBeUndefined();
    action?.onSelect?.();
    expect(execute).toHaveBeenCalledWith({
      type: 'occurrence_action',
      occurrenceId: occurrence.id,
      action: { type: 'complete', participantId: 'sam' },
    });
  });
});
