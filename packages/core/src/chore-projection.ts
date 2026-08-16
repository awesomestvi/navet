import type { ChoreOccurrence, ChoreWorkspaceData } from './chores';
import { getChoreTiming } from './chores';

export const CHORE_PROJECTION_CONTRACT_VERSION = 1 as const;

export type ChoreProjectionState = 'idle' | 'due' | 'overdue' | 'approval';

export interface ChoreProjectionOccurrence {
  id: string;
  definitionId: string;
  title: string;
  scheduledAt: string;
  dueAt: string;
  assigneeIds: string[];
  status: ChoreOccurrence['status'];
  timing: ReturnType<typeof getChoreTiming>;
}

export interface ChoreProjectionSnapshot {
  contractVersion: typeof CHORE_PROJECTION_CONTRACT_VERSION;
  generatedAt: string;
  revision?: number;
  state: ChoreProjectionState;
  counts: {
    dueNow: number;
    overdue: number;
    awaitingApproval: number;
    completedToday: number;
  };
  next: ChoreProjectionOccurrence[];
  services: readonly ['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'];
}

export interface ChoreProjectionActionRequest {
  action: 'claim' | 'complete' | 'approve' | 'reject' | 'skip' | 'reopen' | 'reassign';
  occurrenceId: string;
  participantId: string;
  reason?: string;
  assigneeIds?: string[];
}

const SERVICES = ['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'] as const;

export function buildChoreProjectionSnapshot(input: {
  workspace: ChoreWorkspaceData;
  revision?: number;
  now?: string;
}): ChoreProjectionSnapshot {
  const generatedAt = input.now ?? new Date().toISOString();
  const now = new Date(generatedAt);
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid chore projection timestamp');
  const today = generatedAt.slice(0, 10);
  const occurrences = Object.values(input.workspace.occurrencesById);
  const active = occurrences.filter(
    (occurrence) => occurrence.status !== 'done' && occurrence.status !== 'skipped'
  );
  const overdue = active.filter((occurrence) => getChoreTiming(occurrence, now) === 'overdue');
  const dueNow = active.filter((occurrence) => getChoreTiming(occurrence, now) === 'due');
  const awaitingApproval = active.filter((occurrence) => occurrence.status === 'awaiting_approval');
  const completedToday = occurrences.filter(
    (occurrence) => occurrence.status === 'done' && occurrence.completedAt?.startsWith(today)
  );
  const state: ChoreProjectionState =
    awaitingApproval.length > 0
      ? 'approval'
      : overdue.length > 0
        ? 'overdue'
        : dueNow.length > 0
          ? 'due'
          : 'idle';

  return {
    contractVersion: CHORE_PROJECTION_CONTRACT_VERSION,
    generatedAt,
    revision: input.revision,
    state,
    counts: {
      dueNow: dueNow.length,
      overdue: overdue.length,
      awaitingApproval: awaitingApproval.length,
      completedToday: completedToday.length,
    },
    next: active
      .sort(
        (left, right) => left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id)
      )
      .slice(0, 10)
      .map((occurrence) => ({
        id: occurrence.id,
        definitionId: occurrence.definitionId,
        title:
          input.workspace.definitionsById[occurrence.definitionId]?.title ??
          occurrence.definitionId,
        scheduledAt: occurrence.scheduledAt,
        dueAt: occurrence.dueAt,
        assigneeIds: [...occurrence.assigneeIds],
        status: occurrence.status,
        timing: getChoreTiming(occurrence, now),
      })),
    services: SERVICES,
  };
}
