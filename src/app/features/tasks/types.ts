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

export interface AutomationTaskGroup {
  key: 'automations';
  title: string;
  singularLabel: string;
  pluralLabel: string;
  tasks: AutomationTask[];
}
