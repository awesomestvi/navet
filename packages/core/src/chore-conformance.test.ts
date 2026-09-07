import { describe, expect, it } from 'vitest';
import vectors from './chore-conformance-vectors.json';
import {
  type ApplyChoreCommandInput,
  applyChoreOccurrenceCommand,
  type ChoreDefinition,
  type ChoreParticipant,
  materializeChoreOccurrences,
} from './chores';

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

describe('shared occurrence transition conformance', () => {
  for (const vector of vectors.occurrenceTransitions) {
    it(vector.name, () => {
      const fixture = vectors.occurrenceFixture;
      const input = {
        definition: { ...fixture.definition, ...vector.definition },
        occurrence: { ...fixture.occurrence, ...vector.occurrence },
        command: vector.command,
        timestamp: fixture.timestamp,
        commandId: 'conformance',
      } as ApplyChoreCommandInput;
      if (vector.error) {
        expect(() => applyChoreOccurrenceCommand(input)).toThrow(vector.error);
      } else {
        const result = applyChoreOccurrenceCommand(input);
        expect(result.activity.type).toBe(vector.event);
        for (const [key, value] of Object.entries(vector.expected)) {
          expect((result.occurrence as unknown as Record<string, unknown>)[key] ?? null).toEqual(
            value
          );
        }
      }
    });
  }
});
