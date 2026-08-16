import { describe, expect, it } from 'vitest';
import { createChoreInterchangeDocument } from './chore-interchange';
import {
  addChoreWorkspace,
  createChoreWorkspaceDirectory,
  deleteChoreWorkspace,
  parseChoreWorkspaceDirectory,
  switchChoreWorkspace,
} from './chore-workspace-directory';
import { createEmptyChoreWorkspace } from './chores';

const backup = createChoreInterchangeDocument({
  workspace: createEmptyChoreWorkspace(),
  events: [],
  exportedAt: '2026-08-14T00:00:00.000Z',
});

describe('chore workspace directory', () => {
  it('keeps workspace ownership installation-scoped and switching explicit', () => {
    const directory = createChoreWorkspaceDirectory({
      installationId: 'installation-1',
      workspaceId: 'home',
      name: 'Home',
      backup,
      timestamp: '2026-08-14T00:00:00.000Z',
    });
    const withCabin = addChoreWorkspace({
      directory,
      installationId: 'installation-1',
      workspaceId: 'cabin',
      name: 'Cabin',
      backup,
      timestamp: '2026-08-14T01:00:00.000Z',
    });
    expect(
      switchChoreWorkspace({
        directory: withCabin,
        installationId: 'installation-1',
        workspaceId: 'cabin',
      }).activeWorkspaceId
    ).toBe('cabin');
    expect(() =>
      switchChoreWorkspace({
        directory: withCabin,
        installationId: 'installation-2',
        workspaceId: 'cabin',
      })
    ).toThrow('another installation');
  });

  it('requires exact deletion confirmation and always leaves a usable workspace', () => {
    const directory = addChoreWorkspace({
      directory: createChoreWorkspaceDirectory({
        installationId: 'installation-1',
        workspaceId: 'home',
        name: 'Home',
        backup,
      }),
      installationId: 'installation-1',
      workspaceId: 'cabin',
      name: 'Cabin',
      backup,
    });
    expect(() =>
      deleteChoreWorkspace({
        directory,
        installationId: 'installation-1',
        workspaceId: 'home',
        confirmation: 'DELETE',
      })
    ).toThrow('confirmation');
    const deleted = deleteChoreWorkspace({
      directory,
      installationId: 'installation-1',
      workspaceId: 'home',
      confirmation: 'DELETE WORKSPACE home',
    });
    expect(deleted.activeWorkspaceId).toBe('cabin');
    expect(parseChoreWorkspaceDirectory(deleted)).toEqual(deleted);
    expect(() =>
      deleteChoreWorkspace({
        directory: deleted,
        installationId: 'installation-1',
        workspaceId: 'cabin',
        confirmation: 'DELETE WORKSPACE cabin',
      })
    ).toThrow('at least one');
  });
});
