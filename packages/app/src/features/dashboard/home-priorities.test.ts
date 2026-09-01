import type { DeviceWithType } from '@navet/app/types/device.types';
import type { ChoreWorkspaceData } from '@navet/core/chores';
import { describe, expect, it } from 'vitest';
import { buildHomePriorityEntries } from './home-priorities';
import {
  buildPrivatePriorityRankRequest,
  doesPriorityFeedbackSuppressEntry,
} from './hooks/use-home-priorities';

const now = new Date('2026-09-01T08:00:00.000Z');

function trashWorkspace(
  status: 'available' | 'done' | 'skipped' | 'awaiting_approval' = 'available'
) {
  return {
    definitionsById: {
      trash: {
        id: 'trash',
        title: 'Take out trash',
        enabled: true,
        approval: { required: false, approverIds: [] },
      },
    },
    occurrencesById: {
      'trash-today': {
        id: 'trash-today',
        definitionId: 'trash',
        scheduledAt: '2026-09-01T18:00:00.000Z',
        dueAt: '2026-09-01T20:00:00.000Z',
        assigneeIds: [],
        assignmentSlot: 'all',
        status,
        updatedAt: '2026-09-01T07:00:00.000Z',
      },
    },
  } as unknown as ChoreWorkspaceData;
}

describe('home priority candidates', () => {
  it('surfaces the trash-day chore and removes completed or skipped occurrences', () => {
    const entries = buildHomePriorityEntries({
      devices: [],
      choreWorkspace: trashWorkspace(),
      choresEnabled: true,
      now,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].presentation).toEqual({ title: 'Take out trash', detail: 'Due today' });
    expect(entries[0].candidate.sourceReference).toMatchObject({
      section: 'tasks',
      occurrenceId: 'trash-today',
    });
    expect(
      buildHomePriorityEntries({
        devices: [],
        choreWorkspace: trashWorkspace('done'),
        choresEnabled: true,
        now,
      })
    ).toEqual([]);
    expect(
      buildHomePriorityEntries({
        devices: [],
        choreWorkspace: trashWorkspace('skipped'),
        choresEnabled: true,
        now,
      })
    ).toEqual([]);
  });

  it('orders critical safety ahead of chores and ignores generic unknown devices', () => {
    const critical = {
      id: 'sensor.smoke',
      canonicalId: 'home_assistant:sensor.smoke',
      name: 'Kitchen smoke alarm',
      type: 'sensors',
      room: 'Kitchen',
      size: 'small',
      value: 'Smoke',
      unit: '',
      securityKind: 'smoke',
      securitySeverity: 'critical',
      status: 'active',
    } as DeviceWithType;
    const unknown = {
      id: 'sensor.unknown',
      name: 'Unknown sensor',
      type: 'sensors',
      room: 'Hall',
      size: 'small',
      value: 'Unknown',
      unit: '',
      securitySeverity: 'unknown',
      status: 'unavailable',
    } as DeviceWithType;
    const entries = buildHomePriorityEntries({
      devices: [unknown, critical],
      choreWorkspace: trashWorkspace(),
      choresEnabled: true,
      now,
    });
    expect(entries.map((entry) => entry.candidate.reasonCode)).toEqual([
      'security_critical',
      'chore_due_today',
    ]);
  });

  it('uses private calendar summaries by default and keeps ordinary forecasts out of attention', () => {
    const calendar = {
      id: 'calendar.family',
      name: 'Family',
      type: 'calendars',
      room: 'Home',
      size: 'small',
      events: [
        {
          id: 'dentist',
          title: 'Private dentist appointment',
          startTime: '2026-09-01T09:00:00.000Z',
          endTime: '2026-09-01T10:00:00.000Z',
          timeDisplay: '09:00',
          type: 'event',
          color: '#fff',
        },
      ],
    } as DeviceWithType;
    const ordinaryWeather = {
      id: 'weather.home',
      name: 'Weather',
      type: 'weather',
      room: 'Home',
      size: 'small',
      condition: 'sunny',
    } as DeviceWithType;
    const privateEntries = buildHomePriorityEntries({
      devices: [calendar, ordinaryWeather],
      choresEnabled: false,
      now,
    });
    expect(privateEntries).toHaveLength(1);
    expect(privateEntries[0].presentation.title).toBe('Calendar event');
    expect(privateEntries[0].candidate.sharedDisplayPolicy).toBe('summary_only');
    expect(
      buildHomePriorityEntries({
        devices: [calendar],
        choresEnabled: false,
        showCalendarTitles: true,
        now,
      })[0].presentation.title
    ).toBe('Private dentist appointment');
  });

  it('surfaces the existing 20 percent battery threshold and generic repair severity', () => {
    const battery = (value: string) =>
      ({
        id: `sensor.battery_${value}`,
        name: 'Door sensor',
        type: 'sensors',
        room: 'Hall',
        size: 'small',
        value,
        unit: '%',
        deviceClass: 'battery',
      }) as DeviceWithType;
    const entries = buildHomePriorityEntries({
      devices: [battery('20'), battery('21')],
      choresEnabled: false,
      repairIssues: [
        {
          issue_id: 'secret-provider-repair',
          severity: 'error',
          description: 'Private notification text',
        },
      ],
      now,
    });
    expect(entries.map((entry) => entry.candidate.reasonCode)).toEqual([
      'repair_error',
      'battery_critical',
    ]);
    expect(JSON.stringify(entries)).not.toContain('Private notification text');
  });

  it('requires learning consent before energy evidence can become a priority', () => {
    const evidence = { observedAt: '2026-09-01T07:30:00.000Z', sampleCount: 4 };
    expect(
      buildHomePriorityEntries({
        devices: [],
        choresEnabled: false,
        energyHigherThanUsual: evidence,
        learningEnabled: false,
        now,
      })
    ).toEqual([]);
    expect(
      buildHomePriorityEntries({
        devices: [],
        choresEnabled: false,
        energyHigherThanUsual: evidence,
        learningEnabled: true,
        now,
      })[0].candidate.reasonCode
    ).toBe('energy_higher_than_usual');
  });

  it('keeps private and identifying fields outside the model request', () => {
    const entries = buildHomePriorityEntries({
      devices: [],
      choreWorkspace: trashWorkspace(),
      choresEnabled: true,
      now,
    });
    const request = buildPrivatePriorityRankRequest(
      entries,
      [],
      new Map([[entries[0].candidate.id, 'opaque_token_123']])
    );
    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain('Take out trash');
    expect(serialized).not.toContain('trash-today');
    expect(serialized).not.toContain('providerId');
    expect(serialized).not.toContain('canonical');
    expect(request.candidates[0].token).toBe('opaque_token_123');
  });

  it('never suppresses an active critical safety item from attention feedback', () => {
    const critical = {
      id: 'sensor.smoke',
      name: 'Kitchen smoke alarm',
      type: 'sensors',
      room: 'Kitchen',
      size: 'small',
      value: 'Smoke',
      unit: '',
      securityKind: 'smoke',
      securitySeverity: 'critical',
      status: 'active',
    } as DeviceWithType;
    const [entry] = buildHomePriorityEntries({
      devices: [critical],
      choresEnabled: false,
      now,
    });
    expect(
      doesPriorityFeedbackSuppressEntry(
        entry,
        {
          candidateId: entry.candidate.id,
          source: 'security',
          reasonCode: 'security_critical',
          outcome: 'dismissed',
          timestamp: now.toISOString(),
        },
        now.getTime()
      )
    ).toBe(false);
  });
});
