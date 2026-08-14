import {
  type ChoreActivity,
  type ChoreActivityType,
  type ChoreWorkspaceData,
  materializeChoreOccurrences,
} from '@navet/core/chores';

const RETENTION_DAYS = 90;

export function createChoreCommandId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `chore:${crypto.randomUUID()}`;
  }
  return `chore:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function createChoreActivity(input: {
  commandId: string;
  type: ChoreActivityType;
  timestamp: string;
  actorParticipantId?: string;
  participantId?: string;
  definitionId?: string;
  occurrenceId?: string;
}): ChoreActivity {
  return {
    id: `activity:${input.commandId}`,
    commandId: input.commandId,
    type: input.type,
    timestamp: input.timestamp,
    actorParticipantId: input.actorParticipantId,
    participantId: input.participantId,
    definitionId: input.definitionId,
    occurrenceId: input.occurrenceId,
  };
}

export function archiveChoreDefinition(
  data: ChoreWorkspaceData,
  definitionId: string,
  timestamp: string
): ChoreWorkspaceData {
  const definition = data.definitionsById[definitionId];
  if (!definition) {
    throw new Error('Chore is no longer available');
  }

  return {
    ...data,
    definitionsById: {
      ...data.definitionsById,
      [definitionId]: {
        ...definition,
        archivedAt: timestamp,
        enabled: false,
        updatedAt: timestamp,
      },
    },
    occurrencesById: Object.fromEntries(
      Object.entries(data.occurrencesById).filter(
        ([, occurrence]) =>
          occurrence.definitionId !== definitionId ||
          occurrence.status === 'done' ||
          occurrence.status === 'skipped'
      )
    ),
  };
}

export function materializeChoreWorkspace(
  data: ChoreWorkspaceData,
  now = new Date()
): { changed: boolean; data: ChoreWorkspaceData } {
  const rangeStart = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
  const rangeEnd = new Date(now.getTime() + 45 * 86_400_000).toISOString();
  const occurrencesById = { ...data.occurrencesById };
  let changed = false;

  for (const definition of Object.values(data.definitionsById)) {
    const latestCompletedAt = Object.values(occurrencesById)
      .filter(
        (occurrence) =>
          occurrence.definitionId === definition.id && occurrence.completedAt !== undefined
      )
      .map((occurrence) => occurrence.completedAt as string)
      .sort()
      .at(-1);
    const occurrences = materializeChoreOccurrences({
      definition,
      participantsById: data.participantsById,
      existingOccurrences: occurrencesById,
      latestCompletedAt,
      rangeStart,
      rangeEnd,
    });
    for (const occurrence of occurrences) {
      if (!occurrencesById[occurrence.id]) {
        occurrencesById[occurrence.id] = occurrence;
        changed = true;
      }
    }
  }

  const retentionBoundary = now.getTime() - RETENTION_DAYS * 86_400_000;
  for (const occurrence of Object.values(occurrencesById)) {
    if (
      (occurrence.status === 'done' || occurrence.status === 'skipped') &&
      Date.parse(occurrence.scheduledAt) < retentionBoundary
    ) {
      delete occurrencesById[occurrence.id];
      changed = true;
    }
  }

  return changed ? { changed, data: { ...data, occurrencesById } } : { changed, data };
}
