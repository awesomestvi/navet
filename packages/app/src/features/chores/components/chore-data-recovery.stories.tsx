import { createChoreInterchangeDocument } from '@navet/core/chore-interchange';
import { createEmptyChoreWorkspace } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import { ChoreDataRecovery } from './chore-data-recovery';

const backup = createChoreInterchangeDocument({
  workspace: createEmptyChoreWorkspace(),
  events: [],
  exportedAt: '2026-10-06T12:00:00Z',
});
function RetryFixture({ onImportComplete }: { onImportComplete: () => void }) {
  useEffect(() => {
    const previousRestore = useChoreWorkspaceStore.getState().restoreBackup;
    let attempts = 0;
    useChoreWorkspaceStore.setState({ restoreBackup: async () => ++attempts > 1 });
    return () => useChoreWorkspaceStore.setState({ restoreBackup: previousRestore });
  }, []);
  return (
    <ChoreDataRecovery
      managerActorId="manager"
      participants={[]}
      onImportComplete={onImportComplete}
    />
  );
}
const meta = {
  title: 'Pages/Household/Backup Recovery',
  component: RetryFixture,
  tags: ['autodocs'],
  args: { onImportComplete: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Synthetic failed-then-successful backup restore using the existing Household confirmation dialog. Verifies local retry UI; no provider persistence is exercised.',
      },
    },
  },
} satisfies Meta<typeof RetryFixture>;
export default meta;
type Story = StoryObj<typeof meta>;

async function retryImport(
  mode: 'Merge' | 'Replace',
  canvasElement: HTMLElement,
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
  onImportComplete: () => void
) {
  const page = within(canvasElement.ownerDocument.body);
  await userEvent.upload(
    page.getByLabelText('Import backup', { selector: 'input' }),
    new File([JSON.stringify(backup)], 'chores.json', { type: 'application/json' })
  );
  const dialog = await page.findByRole('alertdialog');
  await userEvent.click(within(dialog).getByRole('button', { name: mode }));
  await expect(await page.findByRole('alert')).toHaveTextContent('Try Merge or Replace again');
  await expect(onImportComplete).not.toHaveBeenCalled();
  await userEvent.click(within(dialog).getByRole('button', { name: mode }));
  await waitFor(() => expect(onImportComplete).toHaveBeenCalledOnce());
  await waitFor(() => expect(page.queryByRole('alertdialog')).not.toBeInTheDocument());
}
export const FailedMergeRetry: Story = {
  play: async ({ canvasElement, userEvent, args }) =>
    retryImport('Merge', canvasElement, userEvent, args.onImportComplete),
};
export const FailedReplaceRetry: Story = {
  play: async ({ canvasElement, userEvent, args }) =>
    retryImport('Replace', canvasElement, userEvent, args.onImportComplete),
};
