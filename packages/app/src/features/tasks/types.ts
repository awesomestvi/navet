export interface AutomationTask {
  id: string;
  name: string;
  room: string;
  enabled: boolean;
  state: string;
  lastTriggered?: string;
  description?: string;
  mode?: string;
  currentRuns?: number;
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
