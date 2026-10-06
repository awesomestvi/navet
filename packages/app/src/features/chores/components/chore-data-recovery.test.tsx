import { renderWithProviders } from '@navet/app/test/render';
import { createChoreInterchangeDocument } from '@navet/core/chore-interchange';
import { createEmptyChoreWorkspace } from '@navet/core/chores';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import { ChoreDataRecovery } from './chore-data-recovery';

const backup = createChoreInterchangeDocument({
  workspace: createEmptyChoreWorkspace(),
  events: [],
});
async function selectBackup() {
  fireEvent.change(screen.getByLabelText('Import backup', { selector: 'input' }), {
    target: { files: [{ text: async () => JSON.stringify(backup) }] },
  });
  await screen.findByRole('alertdialog');
}

describe('ChoreDataRecovery', () => {
  beforeEach(() => useChoreWorkspaceStore.getState().reset());

  it.each(['merge', 'replace'] as const)(
    'retains a failed %s for retry and completes once',
    async (mode) => {
      const restoreBackup = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      useChoreWorkspaceStore.setState({ restoreBackup });
      const complete = vi.fn();
      renderWithProviders(
        <ChoreDataRecovery managerActorId="manager" participants={[]} onImportComplete={complete} />
      );
      await selectBackup();
      const name = mode === 'merge' ? 'Merge' : 'Replace';
      fireEvent.click(screen.getByRole('button', { name }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Try Merge or Replace again');
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(complete).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name }));
      await waitFor(() => expect(complete).toHaveBeenCalledOnce());
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(restoreBackup).toHaveBeenNthCalledWith(2, {
        actorParticipantId: 'manager',
        document: backup,
        mode,
      });
    }
  );

  it('retains a rejected restore and Cancel clears it', async () => {
    useChoreWorkspaceStore.setState({
      restoreBackup: vi.fn().mockRejectedValue(new Error('offline')),
    });
    renderWithProviders(
      <ChoreDataRecovery managerActorId="manager" participants={[]} onImportComplete={vi.fn()} />
    );
    await selectBackup();
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await selectBackup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks duplicate restores and cancellation while saving', async () => {
    let finish!: (saved: boolean) => void;
    const restoreBackup = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        })
    );
    useChoreWorkspaceStore.setState({ restoreBackup });
    const complete = vi.fn();
    renderWithProviders(
      <ChoreDataRecovery managerActorId="manager" participants={[]} onImportComplete={complete} />
    );
    await selectBackup();
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(restoreBackup).toHaveBeenCalledOnce();
    finish(true);
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
  });
});
