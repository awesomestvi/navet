import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';

export const DASHBOARD_PROFILE_CONTRACT_VERSION = 1 as const;
export const DASHBOARD_PROFILE_ID = 'default' as const;
export const DASHBOARD_PROFILE_HISTORY_LIMIT = 20 as const;

export const DASHBOARD_PROFILE_ENDPOINTS = {
  current: '/__navet_profile__/default',
  history: '/__navet_profile__/default/history',
  revisions: '/__navet_profile__/default/revisions',
  accountPreferences: '/__navet_profile__/preferences/account',
  clientPreferences: '/__navet_profile__/preferences/client',
  displayProfiles: '/__navet_profile__/display-profiles',
  copyDisplaySettings: '/__navet_profile__/display-profiles/copy',
  clients: '/__navet_profile__/clients',
  rebindWorkspace: '/__navet_profile__/workspace/rebind',
} as const;

export const DASHBOARD_PROFILE_HEADERS = {
  contractVersion: 'X-Navet-Profile-Contract',
  generation: 'X-Navet-Profile-Generation',
  installationId: 'X-Navet-Installation-Id',
  workspaceId: 'X-Navet-Workspace-Id',
  profileId: 'X-Navet-Profile-Id',
  revision: 'X-Navet-Profile-Revision',
  baseRevision: 'X-Navet-Base-Revision',
  recovery: 'X-Navet-Profile-Recovery',
  resetRevision: 'X-Navet-Profile-Reset-Revision',
  author: 'X-Navet-Profile-Author',
  changedPaths: 'X-Navet-Changed-Paths',
  clientId: 'X-Navet-Client-Id',
  clientName: 'X-Navet-Client-Name',
  clientKind: 'X-Navet-Client-Kind',
  preferenceRevision: 'X-Navet-Preference-Revision',
  preferenceIdentity: 'X-Navet-Preference-Identity',
  errorCode: 'X-Navet-Profile-Error-Code',
} as const;

export const DASHBOARD_PROFILE_ERROR_CODES = {
  workspaceTenantMismatch: 'workspace-tenant-mismatch',
  clientBindingMismatch: 'client-binding-mismatch',
  clientCapacityReached: 'client-capacity-reached',
  profileStorageUnavailable: 'profile-storage-unavailable',
} as const;

export type DashboardProfileErrorCode =
  (typeof DASHBOARD_PROFILE_ERROR_CODES)[keyof typeof DASHBOARD_PROFILE_ERROR_CODES];

export type DashboardProfileRecoveryStatus =
  | 'active'
  | 'uninitialized'
  | 'reset'
  | 'missing'
  | 'recoverable';

export type DashboardClientKind = 'desktop' | 'phone' | 'tablet' | 'wall_panel' | 'unknown';

export interface DashboardWorkspaceIdentity {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION;
  installationId: string;
  workspaceId: string;
  defaultProfileId: typeof DASHBOARD_PROFILE_ID;
  createdAt: string;
}

export interface DashboardProfilePrincipal {
  providerId: string;
  userId: string | null;
  userName: string | null;
}

export interface DashboardProfileClient {
  id: string;
  name: string;
  kind: DashboardClientKind;
}

export interface DashboardProfileAuthor extends DashboardProfileClient {
  providerId: string;
  userId: string | null;
  userName: string | null;
}

export type DashboardProfileChangeKind = 'update' | 'patch' | 'reset' | 'restore';

export interface DashboardProfileRevisionMetadata {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION;
  installationId: string;
  workspaceId: string;
  profileId: typeof DASHBOARD_PROFILE_ID;
  revision: number;
  generation: string;
  kind: DashboardProfileChangeKind;
  updatedAt: string;
  author: DashboardProfileAuthor;
  changedPaths: string[];
  restoredFromRevision?: number;
}

export interface DashboardProfileRecovery {
  status: DashboardProfileRecoveryStatus;
  resetRevision: number | null;
  latestRecoverableRevision: number | null;
}

export interface DashboardProfileDocument {
  workspace: DashboardWorkspaceIdentity;
  metadata: DashboardProfileRevisionMetadata | null;
  recovery: DashboardProfileRecovery;
  profile: DashboardConfigPayload | null;
}

export interface DashboardProfileHistoryEntry extends DashboardProfileRevisionMetadata {
  hasProfile: boolean;
}

export interface DashboardProfileHistoryResponse {
  workspace: DashboardWorkspaceIdentity;
  entries: DashboardProfileHistoryEntry[];
}

export type DashboardProfilePatchOperation =
  | { op: 'add' | 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };

export type DashboardPreferenceScope = 'account' | 'client';

export interface DashboardPreferenceDocument<TValues extends object = Record<string, unknown>> {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION;
  schemaVersion: number;
  scope: DashboardPreferenceScope;
  revision: number;
  updatedAt: string;
  values: TValues;
  principal: DashboardProfilePrincipal;
  clientId: string | null;
}

export interface DashboardPreferenceIdentity {
  principal: DashboardProfilePrincipal;
  clientId: string | null;
}

export interface DashboardDisplayProfileDocument<TValues extends object = Record<string, unknown>> {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  values: TValues;
  author: DashboardProfileAuthor;
}

export interface DashboardDevicePreferenceCopyResult {
  updatedClientIds: string[];
  skippedClientIds: string[];
}

export interface DashboardClientRegistryEntry extends DashboardProfileClient {
  firstSeenAt: string;
  lastSeenAt: string;
  lastRevision: number | null;
  principal: DashboardProfilePrincipal;
}

export interface DashboardClientRegistryResponse {
  workspace: DashboardWorkspaceIdentity;
  clients: DashboardClientRegistryEntry[];
}

export type DashboardProfileClientList = DashboardClientRegistryResponse;
export type DashboardProfileHistory = DashboardProfileHistoryResponse;
export type DashboardProfilePreferenceDocument<TValues extends object = Record<string, unknown>> =
  DashboardPreferenceDocument<TValues>;
