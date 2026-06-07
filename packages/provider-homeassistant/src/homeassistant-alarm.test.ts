import { describe, expect, it } from 'vitest';
import {
  getHomeAssistantAlarmSupportedActions,
  mapHomeAssistantAlarmCodeFormat,
  mapHomeAssistantAlarmState,
  mapHomeAssistantHassAlarmEntity,
  readAlarmSupportedFeatures,
} from './homeassistant-alarm';

function makeAlarmEntity(state: string, attributes: Record<string, unknown> = {}) {
  return {
    entity_id: 'alarm_control_panel.home',
    state,
    attributes,
    last_changed: '2026-06-01T10:00:00.000Z',
    last_updated: '2026-06-01T10:00:00.000Z',
    context: { id: 'ctx-1', parent_id: null, user_id: null },
  };
}

describe('homeassistant-alarm', () => {
  it('maps Home Assistant alarm states into normalized alarm states', () => {
    expect(mapHomeAssistantAlarmState('disarmed')).toBe('disarmed');
    expect(mapHomeAssistantAlarmState('armed_away')).toBe('armed_away');
    expect(mapHomeAssistantAlarmState('armed_custom_bypass')).toBe('armed_custom_bypass');
    expect(mapHomeAssistantAlarmState('triggered')).toBe('triggered');
    expect(mapHomeAssistantAlarmState('unexpected')).toBe('unknown');
  });

  it('detects supported alarm actions from the Home Assistant feature bitmask', () => {
    expect(getHomeAssistantAlarmSupportedActions(1 | 2 | 8 | 32)).toEqual([
      'arm_home',
      'arm_away',
      'arm_vacation',
      'disarm',
      'trigger',
    ]);
  });

  it('maps code formats safely', () => {
    expect(mapHomeAssistantAlarmCodeFormat(null)).toBe('none');
    expect(mapHomeAssistantAlarmCodeFormat('number')).toBe('number');
    expect(mapHomeAssistantAlarmCodeFormat('text')).toBe('text');
    expect(mapHomeAssistantAlarmCodeFormat('weird')).toBe('none');
  });

  it('normalizes the Home Assistant alarm entity into a Navet alarm model', () => {
    const alarm = mapHomeAssistantHassAlarmEntity(
      makeAlarmEntity('armed_away', {
        supported_features: 1 | 4 | 16,
        code_format: 'number',
        code_arm_required: true,
        changed_by: 'Keypad',
      }),
      {
        id: 'home_assistant:alarm_control_panel.home',
        name: 'Home Alarm',
        availability: 'available',
      }
    );

    expect(alarm).toEqual({
      id: 'home_assistant:alarm_control_panel.home',
      name: 'Home Alarm',
      state: 'armed_away',
      supportedActions: ['arm_away', 'arm_night', 'arm_custom_bypass', 'disarm'],
      codeFormat: 'number',
      requiresCode: true,
      changedBy: 'Keypad',
      lastChanged: '2026-06-01T10:00:00.000Z',
      provider: 'home_assistant',
      availability: 'available',
    });
  });

  it('treats unavailable alarms as unavailable regardless of raw state', () => {
    const alarm = mapHomeAssistantHassAlarmEntity(makeAlarmEntity('disarmed'), {
      id: 'home_assistant:alarm_control_panel.home',
      name: 'Home Alarm',
      availability: 'unavailable',
    });

    expect(alarm.state).toBe('unavailable');
  });

  it('parses string feature values defensively', () => {
    expect(readAlarmSupportedFeatures('33')).toBe(33);
    expect(readAlarmSupportedFeatures('oops')).toBe(0);
  });
});
