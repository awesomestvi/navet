import type { ChoreWorkspaceData } from '@navet/core/chores';

export const CHORE_WORKSPACE_ENDPOINTS = {
  current: '/__navet_chores__/workspace',
  commands: '/__navet_chores__/commands',
} as const;

export const CHORE_WORKSPACE_HEADERS = {
  revision: 'X-Navet-Chore-Revision',
  baseRevision: 'X-Navet-Base-Revision',
} as const;

export interface ChoreWorkspaceDocument {
  revision: number;
  updatedAt: string;
  data: ChoreWorkspaceData;
}

export interface ChoreWorkspaceCommandRequest {
  commandId: string;
  baseRevision: number;
  data: ChoreWorkspaceData;
}
