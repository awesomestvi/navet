import { readNavetAlarmEntity } from '@navet/app/core/navet-device-state';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { useMemo } from 'react';

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

function compareAlarms(left: NavetAlarmEntity, right: NavetAlarmEntity) {
  const priorityDifference = ALARM_PRIORITY[left.state] - ALARM_PRIORITY[right.state];
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return left.name.localeCompare(right.name);
}

export function useSecurityAlarmEntities(): NavetAlarmEntity[] {
  const providerEntitiesByCanonicalId = useIntegrationStore(
    integrationSelectors.providerEntitiesByCanonicalId
  );

  return useMemo(
    () =>
      Object.values(providerEntitiesByCanonicalId)
        .map((entity) => readNavetAlarmEntity(entity))
        .filter((entity): entity is NavetAlarmEntity => entity !== null)
        .sort(compareAlarms),
    [providerEntitiesByCanonicalId]
  );
}
