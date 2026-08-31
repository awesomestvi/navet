import { describe, expect, it } from 'vitest';
import type { HomeEvent } from './home-events';
import {
  buildIntelligenceHardwareProfile,
  detectInsightEvidence,
  toNavetInsight,
  validateInsightNarration,
} from './intelligence';

function event(timestamp: string, action: HomeEvent['action']): HomeEvent {
  return {
    id: `${timestamp}:${action}`,
    providerId: 'home_assistant',
    entityId: 'light.kitchen',
    canonicalEntityId: 'home_assistant:light.kitchen',
    domain: 'light',
    roomId: 'kitchen',
    action,
    source: 'manual',
    timestamp,
    previousState: action === 'turned_on' ? 'off' : 'on',
    currentState: action === 'turned_on' ? 'on' : 'off',
    context: { roomId: 'kitchen', occupancy: 'occupied', userPresence: 'home' },
  };
}

describe('Navet intelligence', () => {
  it('selects the 0.8B model for a 4 GB low-power device', () => {
    expect(buildIntelligenceHardwareProfile({ tier: 'low', memoryGb: 4 })).toMatchObject({
      preferredModelId: 'qwen3.5-0.8b',
      detectorBudget: 'minimal',
      maxJournalEvents: 600,
    });
  });

  it('emits evidence and insights without executable fields', () => {
    const evidence = detectInsightEvidence({
      events: [
        event('2026-08-03T07:01:00.000Z', 'turned_on'),
        event('2026-08-10T07:04:00.000Z', 'turned_on'),
        event('2026-08-17T07:03:00.000Z', 'turned_on'),
      ],
      feedback: [],
      profile: buildIntelligenceHardwareProfile({ tier: 'low', memoryGb: 4 }),
      now: new Date('2026-08-18T00:00:00.000Z'),
    });

    expect(evidence).toHaveLength(1);
    const firstEvidence = evidence[0];
    if (!firstEvidence) throw new Error('Expected one evidence item');
    const serialized = JSON.stringify(toNavetInsight(firstEvidence));
    expect(serialized).not.toMatch(/"(action|command|automation|tool|deepLink)"/);
    expect(serialized).toContain('activation_pattern');
  });

  it('rejects model narration containing control language', () => {
    expect(
      validateInsightNarration({ title: 'Morning pattern', summary: 'Turn on the kitchen light.' })
    ).toBeNull();
    expect(
      validateInsightNarration({
        title: 'Morning pattern',
        summary: 'This often happens near 07:00.',
      })
    ).toEqual({ title: 'Morning pattern', summary: 'This often happens near 07:00.' });
  });

  it('does not inspect camera events', () => {
    expect(
      detectInsightEvidence({
        events: [{ ...event('2026-08-17T07:03:00.000Z', 'turned_on'), domain: 'camera' }],
        feedback: [],
        profile: buildIntelligenceHardwareProfile({ tier: 'low', memoryGb: 4 }),
      })
    ).toEqual([]);
  });

  it('can surface repeated presence timing without exposing an action', () => {
    const events: HomeEvent[] = [3, 10, 17].map((day, index) => ({
      ...event(`2026-08-${String(day).padStart(2, '0')}T16:05:00.000Z`, 'presence_changed'),
      id: `presence:${index}`,
      entityId: 'person.resident',
      canonicalEntityId: 'home_assistant:person.resident',
      domain: 'person',
      source: 'unknown',
      previousState: 'not_home',
      currentState: 'home',
    }));
    const evidence = detectInsightEvidence({
      events,
      feedback: [],
      profile: buildIntelligenceHardwareProfile({ tier: 'low', memoryGb: 4 }),
      now: new Date('2026-08-18T00:00:00.000Z'),
    });

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      detectorId: 'arrival_departure',
      observation: 'presence_correlation',
      sampleCount: 3,
    });
    expect(JSON.stringify(evidence[0])).not.toMatch(/"(action|command|automation)"/);
  });
});
