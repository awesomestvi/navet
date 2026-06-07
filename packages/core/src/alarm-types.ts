import type { IntegrationProviderId } from './integration-providers';

export type NavetAlarmState =
  | 'disarmed'
  | 'armed_home'
  | 'armed_away'
  | 'armed_night'
  | 'armed_vacation'
  | 'armed_custom_bypass'
  | 'arming'
  | 'pending'
  | 'disarming'
  | 'triggered'
  | 'unavailable'
  | 'unknown';

export type NavetAlarmAction =
  | 'arm_home'
  | 'arm_away'
  | 'arm_night'
  | 'arm_vacation'
  | 'arm_custom_bypass'
  | 'disarm'
  | 'trigger';

export type NavetAlarmCodeFormat = 'none' | 'number' | 'text';

export interface NavetAlarmEntity {
  id: string;
  name: string;
  state: NavetAlarmState;
  supportedActions: NavetAlarmAction[];
  codeFormat: NavetAlarmCodeFormat;
  requiresCode?: boolean;
  changedBy?: string;
  lastChanged?: string;
  provider: IntegrationProviderId;
  availability?: 'available' | 'unavailable' | 'unknown';
}
