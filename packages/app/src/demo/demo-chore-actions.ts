import { createChoreCommandId } from '@navet/app/features/chores/chore-workspace-model';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { applyChoreWorkspaceAction } from '@navet/core/chores';

/** Keep demo actions in the seeded workspace, using the production chore rules. */
export function installDemoChoreActions() {
  const originalExecute = useChoreWorkspaceStore.getState().execute;
  useChoreWorkspaceStore.setState({
    execute: async (action) => {
      const current = useChoreWorkspaceStore.getState();
      if (!current.data || current.revision === null) return false;
      try {
        const result = applyChoreWorkspaceAction({
          action,
          commandId: createChoreCommandId(),
          timestamp: new Date().toISOString(),
          workspace: current.data,
        });
        useChoreWorkspaceStore.setState({
          data: { ...result.data, activity: [...result.data.activity, result.activity] },
          revision: current.revision + 1,
          error: null,
          status: 'ready',
        });
        return true;
      } catch (error) {
        useChoreWorkspaceStore.setState({
          error: error instanceof Error ? error.message : 'Demo chore could not be updated',
        });
        return false;
      }
    },
  });
  return () => useChoreWorkspaceStore.setState({ execute: originalExecute });
}
