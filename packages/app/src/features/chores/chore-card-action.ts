import type { TranslateFn } from '@navet/app/i18n';
import type { ChoreDefinition, ChoreOccurrence, ChoreWorkspaceAction } from '@navet/core/chores';
import type { ChoreCardAction } from './components/chore-card';

export function getChoreCardAction(
  occurrence: ChoreOccurrence,
  definition: ChoreDefinition,
  participantId: string,
  execute: (action: ChoreWorkspaceAction) => Promise<boolean>,
  t: TranslateFn
): ChoreCardAction | undefined {
  if (occurrence.status === 'done' || occurrence.status === 'missed') {
    return undefined;
  }
  const actionParticipantId =
    participantId === 'all' && occurrence.assigneeIds.length === 1
      ? occurrence.assigneeIds[0]
      : participantId;
  if (!actionParticipantId || actionParticipantId === 'all') return undefined;
  const run = (type: 'claim' | 'complete' | 'approve') => () => {
    void execute({
      type: 'occurrence_action',
      occurrenceId: occurrence.id,
      action: { type, participantId: actionParticipantId },
    });
  };
  if (
    occurrence.status === 'awaiting_approval' &&
    definition.approval.approverIds.includes(actionParticipantId)
  ) {
    return {
      label: t('household.actions.approve'),
      kind: 'approve',
      onSelect: run('approve'),
    };
  }
  if (!occurrence.assigneeIds.includes(actionParticipantId)) return undefined;
  if (definition.claimPolicy?.required && occurrence.status === 'available') {
    return { label: t('household.actions.claim'), kind: 'claim', onSelect: run('claim') };
  }
  if (
    occurrence.status === 'available' ||
    (occurrence.status === 'claimed' && occurrence.claimedBy === actionParticipantId)
  ) {
    return {
      label: t('household.actions.complete'),
      kind: 'complete',
      onSelect: run('complete'),
    };
  }
  return undefined;
}
