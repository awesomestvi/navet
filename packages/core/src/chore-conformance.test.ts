import { describe, expect, it } from 'vitest';
import vectors from './chore-conformance-vectors.json';
import { type ChoreDefinition, type ChoreParticipant, materializeChoreOccurrences } from './chores';

describe('shared chore conformance vectors', () => {
  for (const vector of vectors.materialization) {
    it(vector.name, () => {
      const participantsById = Object.fromEntries(
        vector.participants.map((participant) => [participant.id, participant])
      ) as Record<string, ChoreParticipant>;
      const occurrences = materializeChoreOccurrences({
        definition: vector.definition as ChoreDefinition,
        participantsById,
        rangeStart: vector.rangeStart,
        rangeEnd: vector.rangeEnd,
      });

      expect(
        occurrences.map(({ scheduledAt, assigneeIds }) => ({ scheduledAt, assigneeIds }))
      ).toEqual(vector.expected);
    });
  }
});
