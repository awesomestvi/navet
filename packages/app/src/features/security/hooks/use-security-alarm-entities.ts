import { readNavetAlarmEntity } from '@navet/app/core/navet-device-state';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import type { NavetEntity } from '@navet/core/types';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

const ALARM_PRIORITY: Record<NavetAlarmEntity['state'], number> = {
  triggered: 0,
  pending: 1,
  arming: 2,
  disarming: 3,
  armed_away: 4,
  armed_home: 5,
  armed_night: 6,
  armed_vacation: 7,
  armed_custom_bypass: 8,
  disarmed: 9,
  unavailable: 10,
  unknown: 11,
};
const EMPTY_ALARM_ENTITIES: NavetEntity[] = [];
let cachedAlarmEntitySource: Record<string, NavetEntity> | undefined;
let cachedAlarmEntities = EMPTY_ALARM_ENTITIES;

function compareAlarms(left: NavetAlarmEntity, right: NavetAlarmEntity) {
  const priorityDifference = ALARM_PRIORITY[left.state] - ALARM_PRIORITY[right.state];
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return left.name.localeCompare(right.name);
}

function hasAlarmState(entity: NavetEntity) {
  return typeof entity.attributes.alarmState === 'string';
}

function selectAlarmEntities(state: {
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
}) {
  if (state.providerEntitiesByCanonicalId === cachedAlarmEntitySource) {
    return cachedAlarmEntities;
  }

  cachedAlarmEntitySource = state.providerEntitiesByCanonicalId;
  cachedAlarmEntities = Object.values(state.providerEntitiesByCanonicalId).filter(hasAlarmState);
  return cachedAlarmEntities;
}

export function useSecurityAlarmEntities(): NavetAlarmEntity[] {
  const alarmEntities = useIntegrationStore(selectAlarmEntities, shallow);

  return useMemo(
    () =>
      alarmEntities
        .map((entity) => readNavetAlarmEntity(entity))
        .filter((entity): entity is NavetAlarmEntity => entity !== null)
        .sort(compareAlarms),
    [alarmEntities]
  );
}
