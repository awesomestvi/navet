import type { ChoreInterchangeDocument } from './chore-interchange';
import { parseChoreInterchangeDocument } from './chore-interchange';

export const CHORE_WORKSPACE_DIRECTORY_VERSION = 1 as const;

export interface ChoreWorkspaceDirectoryEntry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  backup: ChoreInterchangeDocument;
}

export interface ChoreWorkspaceDirectory {
  contract: 'navet.chore-workspaces';
  version: typeof CHORE_WORKSPACE_DIRECTORY_VERSION;
  installationId: string;
  activeWorkspaceId: string;
  workspacesById: Record<string, ChoreWorkspaceDirectoryEntry>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertTimestamp(value: string) {
  if (!Number.isFinite(Date.parse(value))) throw new Error('Invalid workspace timestamp');
}

function assertIdentity(id: string, name: string) {
  if (!id.trim() || id.length > 100 || !name.trim() || name.trim().length > 80) {
    throw new Error('Valid workspace identity is required');
  }
}

export function createChoreWorkspaceDirectory(input: {
  installationId: string;
  workspaceId: string;
  name: string;
  backup: ChoreInterchangeDocument;
  timestamp?: string;
}): ChoreWorkspaceDirectory {
  if (!input.installationId.trim()) throw new Error('Installation ownership is required');
  assertIdentity(input.workspaceId, input.name);
  const timestamp = input.timestamp ?? new Date().toISOString();
  assertTimestamp(timestamp);
  const backup = parseChoreInterchangeDocument(input.backup);
  return {
    contract: 'navet.chore-workspaces',
    version: CHORE_WORKSPACE_DIRECTORY_VERSION,
    installationId: input.installationId,
    activeWorkspaceId: input.workspaceId,
    workspacesById: {
      [input.workspaceId]: {
        id: input.workspaceId,
        name: input.name.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
        backup,
      },
    },
  };
}

export function addChoreWorkspace(input: {
  directory: ChoreWorkspaceDirectory;
  installationId: string;
  workspaceId: string;
  name: string;
  backup: ChoreInterchangeDocument;
  timestamp?: string;
}): ChoreWorkspaceDirectory {
  if (input.directory.installationId !== input.installationId) {
    throw new Error('Workspace belongs to another installation');
  }
  assertIdentity(input.workspaceId, input.name);
  if (input.directory.workspacesById[input.workspaceId])
    throw new Error('Workspace already exists');
  const timestamp = input.timestamp ?? new Date().toISOString();
  assertTimestamp(timestamp);
  const next = clone(input.directory);
  next.workspacesById[input.workspaceId] = {
    id: input.workspaceId,
    name: input.name.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    backup: parseChoreInterchangeDocument(input.backup),
  };
  return next;
}

export function switchChoreWorkspace(input: {
  directory: ChoreWorkspaceDirectory;
  installationId: string;
  workspaceId: string;
}): ChoreWorkspaceDirectory {
  if (input.directory.installationId !== input.installationId) {
    throw new Error('Workspace belongs to another installation');
  }
  if (!input.directory.workspacesById[input.workspaceId])
    throw new Error('Workspace was not found');
  return { ...clone(input.directory), activeWorkspaceId: input.workspaceId };
}

export function updateActiveChoreWorkspaceBackup(input: {
  directory: ChoreWorkspaceDirectory;
  installationId: string;
  backup: ChoreInterchangeDocument;
  timestamp?: string;
}): ChoreWorkspaceDirectory {
  if (input.directory.installationId !== input.installationId) {
    throw new Error('Workspace belongs to another installation');
  }
  const timestamp = input.timestamp ?? new Date().toISOString();
  assertTimestamp(timestamp);
  const next = clone(input.directory);
  const active = next.workspacesById[next.activeWorkspaceId];
  if (!active) throw new Error('Active workspace was not found');
  active.backup = parseChoreInterchangeDocument(input.backup);
  active.updatedAt = timestamp;
  return next;
}

export function deleteChoreWorkspace(input: {
  directory: ChoreWorkspaceDirectory;
  installationId: string;
  workspaceId: string;
  confirmation: string;
}): ChoreWorkspaceDirectory {
  if (input.directory.installationId !== input.installationId) {
    throw new Error('Workspace belongs to another installation');
  }
  if (input.confirmation !== `DELETE WORKSPACE ${input.workspaceId}`) {
    throw new Error('Workspace deletion confirmation does not match');
  }
  if (!input.directory.workspacesById[input.workspaceId])
    throw new Error('Workspace was not found');
  if (Object.keys(input.directory.workspacesById).length === 1) {
    throw new Error('The installation needs at least one chores workspace');
  }
  const next = clone(input.directory);
  delete next.workspacesById[input.workspaceId];
  if (next.activeWorkspaceId === input.workspaceId) {
    next.activeWorkspaceId = Object.keys(next.workspacesById).sort()[0] as string;
  }
  return next;
}

export function parseChoreWorkspaceDirectory(value: unknown): ChoreWorkspaceDirectory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid chores workspace directory');
  }
  const directory = value as Partial<ChoreWorkspaceDirectory>;
  if (
    directory.contract !== 'navet.chore-workspaces' ||
    directory.version !== CHORE_WORKSPACE_DIRECTORY_VERSION ||
    typeof directory.installationId !== 'string' ||
    typeof directory.activeWorkspaceId !== 'string' ||
    !directory.workspacesById ||
    typeof directory.workspacesById !== 'object'
  ) {
    throw new Error('Invalid chores workspace directory');
  }
  const workspacesById: Record<string, ChoreWorkspaceDirectoryEntry> = {};
  for (const [id, entryValue] of Object.entries(directory.workspacesById)) {
    if (!entryValue || typeof entryValue !== 'object') throw new Error('Invalid workspace entry');
    const entry = entryValue as Partial<ChoreWorkspaceDirectoryEntry>;
    if (
      entry.id !== id ||
      typeof entry.name !== 'string' ||
      typeof entry.createdAt !== 'string' ||
      typeof entry.updatedAt !== 'string'
    ) {
      throw new Error('Invalid workspace entry');
    }
    assertIdentity(entry.id, entry.name);
    assertTimestamp(entry.createdAt);
    assertTimestamp(entry.updatedAt);
    workspacesById[id] = {
      id,
      name: entry.name,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      backup: parseChoreInterchangeDocument(entry.backup),
    };
  }
  if (!workspacesById[directory.activeWorkspaceId]) {
    throw new Error('Active workspace was not found');
  }
  return {
    contract: 'navet.chore-workspaces',
    version: CHORE_WORKSPACE_DIRECTORY_VERSION,
    installationId: directory.installationId,
    activeWorkspaceId: directory.activeWorkspaceId,
    workspacesById,
  };
}
