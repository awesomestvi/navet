import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { getDashboardProfileChangedPaths, mergeDashboardProfiles } from './dashboard-profile-diff';

export type DashboardProfileReconciliation =
  | { kind: 'already-current'; profile: DashboardConfigPayload }
  | { kind: 'apply-remote'; profile: DashboardConfigPayload }
  | { changedPaths: string[]; kind: 'save-merged'; profile: DashboardConfigPayload }
  | {
      kind: 'conflict';
      localChangedPaths: string[];
      overlappingPaths: string[];
      remoteChangedPaths: string[];
    };

export function reconcileDashboardProfiles(input: {
  base: DashboardConfigPayload | null;
  hasPendingLocalChanges: boolean;
  local: DashboardConfigPayload;
  remote: DashboardConfigPayload;
}): DashboardProfileReconciliation {
  const localVsRemote = getDashboardProfileChangedPaths(input.remote, input.local);
  if (localVsRemote.length === 0) {
    return { kind: 'already-current', profile: input.remote };
  }
  if (!input.hasPendingLocalChanges) {
    return { kind: 'apply-remote', profile: input.remote };
  }
  if (!input.base) {
    return {
      kind: 'conflict',
      localChangedPaths: localVsRemote,
      overlappingPaths: ['/'],
      remoteChangedPaths: ['/'],
    };
  }

  const merge = mergeDashboardProfiles(input.base, input.local, input.remote);
  if (!merge.profile) {
    return {
      kind: 'conflict',
      localChangedPaths: merge.localChangedPaths,
      overlappingPaths: merge.overlappingPaths,
      remoteChangedPaths: merge.remoteChangedPaths,
    };
  }

  return {
    changedPaths: merge.localChangedPaths,
    kind: 'save-merged',
    profile: merge.profile,
  };
}
