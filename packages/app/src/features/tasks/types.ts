export interface AutomationTask {
  id: string;
  name: string;
  room: string;
  enabled: boolean;
  state: string;
  status: 'active' | 'disabled' | 'attention';
  lastTriggered?: string;
  lastTriggeredDate?: Date;
  isRecentlyTriggered: boolean;
  needsAttention: boolean;
  attentionReason?: 'unavailable' | 'unknown' | 'error';
  description?: string;
  mode?: string;
  currentRuns?: number;
  nextRunLabel?: string;
}

export interface AutomationRoutine extends AutomationTask {
  type: 'automation';
}

export interface QuickActionRoutine {
  id: string;
  type: 'scene' | 'script';
  name: string;
  room: string;
  state: string;
}

export interface TaskRoutineData {
  automations: AutomationRoutine[];
  quickActions: QuickActionRoutine[];
}
