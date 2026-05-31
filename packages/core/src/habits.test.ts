import { describe, expect, it } from 'vitest';
import { buildHardwareProfile, detectHabitCandidates, isDangerousHabitDomain } from './habits';
import type { HomeEvent } from './home-events';

function makeEvent(overrides: Partial<HomeEvent> & Pick<HomeEvent, 'timestamp'>): HomeEvent {
  return {
    id: `event:${overrides.timestamp}:${overrides.action ?? 'turned_on'}`,
    providerId: 'home_assistant',
    entityId: 'home_assistant:light.kitchen',
    canonicalEntityId: 'home_assistant:light.kitchen',
    domain: 'light',
    roomId: 'Kitchen',
    action: 'turned_on',
    source: 'manual',
    previousState: 'off',
    currentState: 'on',
    context: {
      roomId: 'Kitchen',
      occupancy: 'occupied',
      lux: 18,
      sunPosition: 'night',
      userPresence: 'home',
    },
    ...overrides,
  };
}

describe('habits detection', () => {
  const profile = buildHardwareProfile({ tier: 'medium' });

  it('creates a candidate for repeated manual light-on patterns', () => {
    const events = [
      makeEvent({ timestamp: '2026-05-26T21:00:00.000Z' }),
      makeEvent({ timestamp: '2026-06-02T21:04:00.000Z' }),
      makeEvent({ timestamp: '2026-06-09T21:07:00.000Z' }),
    ];

    const candidates = detectHabitCandidates({
      events,
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-06-10T21:10:00.000Z'),
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          detectorId: 'manual_light_routine',
          action: 'turn_on',
          evidenceCount: 3,
        }),
      ])
    );
  });

  it('does not create a candidate for one-off actions', () => {
    const candidates = detectHabitCandidates({
      events: [makeEvent({ timestamp: '2026-06-01T21:00:00.000Z' })],
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-06-02T21:10:00.000Z'),
    });

    expect(candidates).toHaveLength(0);
  });

  it('reduces priority after dismissal feedback', () => {
    const events = [
      makeEvent({ timestamp: '2026-05-26T21:00:00.000Z' }),
      makeEvent({ timestamp: '2026-06-02T21:04:00.000Z' }),
      makeEvent({ timestamp: '2026-06-09T21:07:00.000Z' }),
    ];
    const [baseline] = detectHabitCandidates({
      events,
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-06-10T21:10:00.000Z'),
    });

    const [penalized] = detectHabitCandidates({
      events,
      feedback: [
        {
          id: 'feedback:1',
          candidateId: baseline.id,
          insightId: `insight:${baseline.id}`,
          outcome: 'dismissed',
          timestamp: '2026-06-10T21:11:00.000Z',
          reason: 'not_useful',
        },
      ],
      rules: [],
      profile,
      now: new Date('2026-06-10T21:12:00.000Z'),
    });

    expect(penalized.confidence).toBeLessThan(baseline.confidence);
  });

  it('drops confidence after a quick reversal', () => {
    const events = [
      makeEvent({ timestamp: '2026-05-26T21:00:00.000Z' }),
      makeEvent({
        timestamp: '2026-05-26T21:01:00.000Z',
        action: 'turned_off',
        previousState: 'on',
        currentState: 'off',
      }),
      makeEvent({ timestamp: '2026-06-02T21:04:00.000Z' }),
      makeEvent({ timestamp: '2026-06-09T21:07:00.000Z' }),
    ];

    const [candidate] = detectHabitCandidates({
      events,
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-06-10T21:10:00.000Z'),
    });

    expect(candidate.confidence).toBeLessThan(0.75);
  });

  it('blocks dangerous domains', () => {
    expect(isDangerousHabitDomain('lock')).toBe(true);

    const candidates = detectHabitCandidates({
      events: [
        makeEvent({
          timestamp: '2026-06-01T21:00:00.000Z',
          domain: 'lock',
          canonicalEntityId: 'home_assistant:lock.front_door',
          entityId: 'home_assistant:lock.front_door',
        }),
        makeEvent({
          timestamp: '2026-06-08T21:00:00.000Z',
          domain: 'lock',
          canonicalEntityId: 'home_assistant:lock.front_door',
          entityId: 'home_assistant:lock.front_door',
        }),
        makeEvent({
          timestamp: '2026-06-15T21:00:00.000Z',
          domain: 'lock',
          canonicalEntityId: 'home_assistant:lock.front_door',
          entityId: 'home_assistant:lock.front_door',
        }),
      ],
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-06-16T21:10:00.000Z'),
    });

    expect(candidates).toHaveLength(0);
  });

  it('decays stale habits over time', () => {
    const events = [
      makeEvent({ timestamp: '2026-01-01T21:00:00.000Z' }),
      makeEvent({ timestamp: '2026-01-08T21:04:00.000Z' }),
      makeEvent({ timestamp: '2026-01-15T21:07:00.000Z' }),
    ];

    const [candidate] = detectHabitCandidates({
      events,
      feedback: [],
      rules: [],
      profile,
      now: new Date('2026-05-31T21:10:00.000Z'),
    });

    expect(candidate.confidence).toBeLessThan(0.5);
  });

  it('uses a minimal detector budget on low hardware', () => {
    const lowProfile = buildHardwareProfile({ tier: 'low', cores: 2, memoryGb: 1 });

    expect(lowProfile.detectorBudget).toBe('minimal');
    expect(lowProfile.maxJournalEvents).toBe(600);
  });
});
