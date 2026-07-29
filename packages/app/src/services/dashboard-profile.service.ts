import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import {
  DASHBOARD_PROFILE_CONTRACT_VERSION,
  DASHBOARD_PROFILE_ENDPOINTS,
  DASHBOARD_PROFILE_ERROR_CODES,
  DASHBOARD_PROFILE_HEADERS,
  DASHBOARD_PROFILE_ID,
  type DashboardClientRegistryResponse,
  type DashboardPreferenceDocument,
  type DashboardPreferenceScope,
  type DashboardProfileAuthor,
  type DashboardProfileClient,
  type DashboardProfileDocument,
  type DashboardProfileErrorCode,
  type DashboardProfileHistoryResponse,
  type DashboardProfilePatchOperation,
  type DashboardProfileRecovery,
  type DashboardProfileRecoveryStatus,
  type DashboardProfileRevisionMetadata,
  type DashboardWorkspaceIdentity,
} from './dashboard-profile.contract';

export interface DashboardProfileLoadOptions {
  etag?: string;
  lastModified?: string;
}

export interface DashboardProfileLoadResult {
  available: boolean;
  unauthorized: boolean;
  failureCode: DashboardProfileErrorCode | null;
  profile: DashboardConfigPayload | null;
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
  generation: string | null;
  revision: number | null;
  workspace: DashboardWorkspaceIdentity | null;
  metadata: DashboardProfileRevisionMetadata | null;
  recovery: DashboardProfileRecovery;
}

export interface DashboardProfileWriteOptions {
  author?: DashboardProfileClient;
  baseRevision?: number;
  changedPaths?: string[];
  client?: DashboardProfileClient;
  etag?: string;
  keepalive?: boolean;
  lastModified?: string;
}

export interface DashboardProfileSaveOptions extends DashboardProfileWriteOptions {}

export interface DashboardProfileWriteResult {
  saved: boolean;
  unauthorized: boolean;
  failureCode: DashboardProfileErrorCode | null;
  permanentFailure: boolean;
  preconditionFailed: boolean;
  preconditionRequired: boolean;
  etag: string | null;
  lastModified: string | null;
  generation: string | null;
  revision: number | null;
  workspace: DashboardWorkspaceIdentity | null;
  metadata: DashboardProfileRevisionMetadata | null;
  recovery: DashboardProfileRecovery;
}

export interface DashboardProfileSaveResult extends DashboardProfileWriteResult {}

export interface DashboardProfileResetResult {
  reset: boolean;
  unauthorized: boolean;
  failureCode: DashboardProfileErrorCode | null;
  permanentFailure: boolean;
  preconditionFailed: boolean;
  preconditionRequired: boolean;
  generation: string | null;
  revision: number | null;
  recovery: DashboardProfileRecovery;
}

export interface DashboardPreferenceLoadResult<TValues extends object = Record<string, unknown>> {
  available: boolean;
  unauthorized: boolean;
  failureCode: DashboardProfileErrorCode | null;
  document: DashboardPreferenceDocument<TValues> | null;
}

export interface DashboardPreferenceWriteResult<TValues extends object = Record<string, unknown>> {
  saved: boolean;
  unauthorized: boolean;
  failureCode: DashboardProfileErrorCode | null;
  permanentFailure: boolean;
  preconditionFailed: boolean;
  preconditionRequired: boolean;
  document: DashboardPreferenceDocument<TValues> | null;
}

export interface DashboardPreferenceOptions {
  author?: DashboardProfileClient;
  baseRevision?: number;
  client?: DashboardProfileClient;
  keepalive?: boolean;
}

export interface DashboardClientTouchResult {
  failureCode: DashboardProfileErrorCode | null;
  registry: DashboardClientRegistryResponse | null;
}

const EMPTY_RECOVERY: DashboardProfileRecovery = {
  status: 'uninitialized',
  resetRevision: null,
  latestRecoverableRevision: null,
};

function unavailableLoadResult(): DashboardProfileLoadResult {
  return {
    available: false,
    unauthorized: false,
    failureCode: null,
    profile: null,
    notModified: false,
    etag: null,
    lastModified: null,
    generation: null,
    revision: null,
    workspace: null,
    metadata: null,
    recovery: EMPTY_RECOVERY,
  };
}

function unavailableWriteResult(): DashboardProfileWriteResult {
  return {
    saved: false,
    unauthorized: false,
    failureCode: null,
    permanentFailure: true,
    preconditionFailed: false,
    preconditionRequired: false,
    etag: null,
    lastModified: null,
    generation: null,
    revision: null,
    workspace: null,
    metadata: null,
    recovery: EMPTY_RECOVERY,
  };
}

function isPermanentProfileFailure(status: number): boolean {
  return (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    status === 413 ||
    status === 422
  );
}

function readProfileErrorCode(response: Response): DashboardProfileErrorCode | null {
  const code = response.headers.get(DASHBOARD_PROFILE_HEADERS.errorCode);
  return code === DASHBOARD_PROFILE_ERROR_CODES.workspaceTenantMismatch ||
    code === DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch ||
    code === DASHBOARD_PROFILE_ERROR_CODES.clientCapacityReached ||
    code === DASHBOARD_PROFILE_ERROR_CODES.profileStorageUnavailable
    ? code
    : null;
}

function readIntegerHeader(response: Response, name: string): number | null {
  const value = response.headers.get(name);
  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readEncodedJsonHeader<T>(response: Response, name: string): T | null {
  const value = response.headers.get(name);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

function readRecovery(response: Response): DashboardProfileRecovery {
  const status = response.headers.get(
    DASHBOARD_PROFILE_HEADERS.recovery
  ) as DashboardProfileRecoveryStatus | null;
  const resetRevision = readIntegerHeader(response, DASHBOARD_PROFILE_HEADERS.resetRevision);
  const latestRecoverableRevision = readIntegerHeader(
    response,
    'X-Navet-Latest-Recoverable-Revision'
  );

  return {
    status:
      status === 'active' ||
      status === 'uninitialized' ||
      status === 'reset' ||
      status === 'missing' ||
      status === 'recoverable'
        ? status
        : 'uninitialized',
    resetRevision,
    latestRecoverableRevision,
  };
}

function readWorkspace(response: Response): DashboardWorkspaceIdentity | null {
  const installationId = response.headers.get(DASHBOARD_PROFILE_HEADERS.installationId);
  const workspaceId = response.headers.get(DASHBOARD_PROFILE_HEADERS.workspaceId);
  if (!installationId || !workspaceId) {
    return null;
  }

  return {
    contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
    installationId,
    workspaceId,
    defaultProfileId: DASHBOARD_PROFILE_ID,
    createdAt: response.headers.get('X-Navet-Workspace-Created-At') ?? '',
  };
}

function readRevisionMetadata(
  response: Response,
  workspace: DashboardWorkspaceIdentity | null
): DashboardProfileRevisionMetadata | null {
  const revision = readIntegerHeader(response, DASHBOARD_PROFILE_HEADERS.revision);
  const generation = response.headers.get(DASHBOARD_PROFILE_HEADERS.generation);
  const author = readEncodedJsonHeader<DashboardProfileAuthor>(
    response,
    DASHBOARD_PROFILE_HEADERS.author
  );
  const changedPaths =
    readEncodedJsonHeader<string[]>(response, DASHBOARD_PROFILE_HEADERS.changedPaths) ?? [];
  const kind = response.headers.get('X-Navet-Profile-Change-Kind');
  const updatedAt = response.headers.get('X-Navet-Profile-Updated-At');

  if (
    revision === null ||
    !generation ||
    !author ||
    !workspace ||
    !updatedAt ||
    (kind !== 'update' && kind !== 'patch' && kind !== 'reset' && kind !== 'restore')
  ) {
    return null;
  }

  const restoredFromRevision = readIntegerHeader(response, 'X-Navet-Restored-From-Revision');

  return {
    contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    profileId: DASHBOARD_PROFILE_ID,
    revision,
    generation,
    kind,
    updatedAt,
    author,
    changedPaths,
    ...(restoredFromRevision === null ? {} : { restoredFromRevision }),
  };
}

function readResponseMetadata(response: Response) {
  const workspace = readWorkspace(response);
  const metadata = readRevisionMetadata(response, workspace);
  return {
    etag: response.headers.get('ETag'),
    lastModified: response.headers.get('Last-Modified'),
    generation: response.headers.get(DASHBOARD_PROFILE_HEADERS.generation),
    revision: readIntegerHeader(response, DASHBOARD_PROFILE_HEADERS.revision),
    workspace,
    metadata,
    recovery: readRecovery(response),
  };
}

function applyClientHeaders(headers: Headers, client?: DashboardProfileClient): void {
  if (!client) {
    return;
  }

  headers.set(DASHBOARD_PROFILE_HEADERS.clientId, client.id);
  headers.set(DASHBOARD_PROFILE_HEADERS.clientName, encodeURIComponent(client.name));
  headers.set(DASHBOARD_PROFILE_HEADERS.clientKind, client.kind);
}

function applyWriteHeaders(headers: Headers, options: DashboardProfileWriteOptions): void {
  applyClientHeaders(headers, options.author ?? options.client);
  if (options.etag) {
    headers.set('If-Match', options.etag);
  } else if (options.lastModified) {
    headers.set('If-Unmodified-Since', options.lastModified);
  }
  if (options.baseRevision !== undefined) {
    headers.set(DASHBOARD_PROFILE_HEADERS.baseRevision, String(options.baseRevision));
  }
  if (options.changedPaths) {
    headers.set(
      DASHBOARD_PROFILE_HEADERS.changedPaths,
      encodeURIComponent(JSON.stringify(options.changedPaths))
    );
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadDashboardProfile(
  options: DashboardProfileLoadOptions = {}
): Promise<DashboardProfileLoadResult> {
  if (isHomeAssistantPanelMode()) {
    return unavailableLoadResult();
  }

  try {
    const headers = new Headers();
    if (options.etag) {
      headers.set('If-None-Match', options.etag);
    } else if (options.lastModified) {
      headers.set('If-Modified-Since', options.lastModified);
    }

    const response = await fetch(
      resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINTS.current),
      {
        cache: 'no-store',
        credentials: 'same-origin',
        headers,
      }
    );
    const metadata = readResponseMetadata(response);

    if (response.status === 401) {
      return {
        ...unavailableLoadResult(),
        unauthorized: true,
        recovery: metadata.recovery,
      };
    }
    if (response.status === 403) {
      return {
        ...unavailableLoadResult(),
        failureCode: readProfileErrorCode(response),
        recovery: metadata.recovery,
      };
    }
    if (response.status === 304) {
      return {
        available: true,
        unauthorized: false,
        failureCode: null,
        profile: null,
        notModified: true,
        ...metadata,
      };
    }
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      return {
        available: response.status !== 404,
        unauthorized: false,
        failureCode: null,
        profile: null,
        notModified: false,
        ...metadata,
      };
    }
    if (!response.ok) {
      throw new Error(`Dashboard profile request failed with status ${response.status}`);
    }

    const profile = await parseJsonResponse<Partial<DashboardConfigPayload>>(response);
    if (profile?.app !== 'navet' || profile.version !== 3) {
      return { ...unavailableLoadResult(), ...metadata };
    }

    return {
      available: true,
      unauthorized: false,
      failureCode: null,
      profile: profile as DashboardConfigPayload,
      notModified: false,
      ...metadata,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to fetch shared dashboard profile:', error);
    return unavailableLoadResult();
  }
}

export async function loadDashboardProfileDocument(
  options: DashboardProfileLoadOptions = {}
): Promise<DashboardProfileDocument | null> {
  const result = await loadDashboardProfile(options);
  if (!result.available || !result.workspace || result.notModified) {
    return null;
  }

  return {
    workspace: result.workspace,
    metadata: result.metadata,
    recovery: result.recovery,
    profile: result.profile,
  };
}

async function writeDashboardProfile(
  method: 'PUT' | 'PATCH',
  body: DashboardConfigPayload | DashboardProfilePatchOperation[],
  options: DashboardProfileWriteOptions
): Promise<DashboardProfileWriteResult> {
  if (isHomeAssistantPanelMode()) {
    return unavailableWriteResult();
  }

  try {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    applyWriteHeaders(headers, options);
    const response = await fetch(
      resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINTS.current),
      {
        method,
        cache: 'no-store',
        credentials: 'same-origin',
        keepalive: options.keepalive,
        headers,
        body: JSON.stringify(body),
      }
    );
    const metadata = readResponseMetadata(response);

    return {
      saved: response.ok,
      unauthorized: response.status === 401,
      failureCode: readProfileErrorCode(response),
      permanentFailure: isPermanentProfileFailure(response.status),
      preconditionFailed: response.status === 412,
      preconditionRequired: response.status === 428,
      ...metadata,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to save shared dashboard profile:', error);
    return { ...unavailableWriteResult(), permanentFailure: false };
  }
}

export async function saveDashboardProfile(
  profile: DashboardConfigPayload,
  options: DashboardProfileSaveOptions = {}
): Promise<DashboardProfileSaveResult> {
  return writeDashboardProfile('PUT', profile, options);
}

export async function patchDashboardProfile(
  operations: DashboardProfilePatchOperation[],
  options: DashboardProfileWriteOptions
): Promise<DashboardProfileWriteResult> {
  return writeDashboardProfile('PATCH', operations, options);
}

export async function deleteDashboardProfile(
  options: DashboardProfileWriteOptions = {}
): Promise<DashboardProfileResetResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      reset: false,
      unauthorized: false,
      failureCode: null,
      permanentFailure: true,
      preconditionFailed: false,
      preconditionRequired: false,
      generation: null,
      revision: null,
      recovery: EMPTY_RECOVERY,
    };
  }

  try {
    const headers = new Headers();
    applyWriteHeaders(headers, options);
    const response = await fetch(
      resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINTS.current),
      {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
        headers,
      }
    );
    const metadata = readResponseMetadata(response);

    return {
      reset: response.ok,
      unauthorized: response.status === 401,
      failureCode: readProfileErrorCode(response),
      permanentFailure: isPermanentProfileFailure(response.status),
      preconditionFailed: response.status === 412,
      preconditionRequired: response.status === 428,
      generation: metadata.generation,
      revision: metadata.revision,
      recovery: metadata.recovery,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to reset shared dashboard profile:', error);
    return {
      reset: false,
      unauthorized: false,
      failureCode: null,
      permanentFailure: false,
      preconditionFailed: false,
      preconditionRequired: false,
      generation: null,
      revision: null,
      recovery: EMPTY_RECOVERY,
    };
  }
}

async function fetchProfileJson<T>(
  endpoint: string,
  init?: RequestInit
): Promise<{ response: Response; body: T | null } | null> {
  if (isHomeAssistantPanelMode()) {
    return null;
  }

  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(endpoint), {
      cache: 'no-store',
      credentials: 'same-origin',
      ...init,
    });
    return { response, body: await parseJsonResponse<T>(response) };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to request profile resource:', error);
    return null;
  }
}

export async function listDashboardProfileHistory(): Promise<DashboardProfileHistoryResponse | null> {
  const result = await fetchProfileJson<DashboardProfileHistoryResponse>(
    DASHBOARD_PROFILE_ENDPOINTS.history
  );
  return result?.response.ok ? result.body : null;
}

export async function loadDashboardProfileRevision(
  revision: number
): Promise<DashboardProfileDocument | null> {
  const result = await fetchProfileJson<DashboardProfileDocument>(
    `${DASHBOARD_PROFILE_ENDPOINTS.revisions}/${revision}`
  );
  return result?.response.ok ? result.body : null;
}

export async function restoreDashboardProfileRevision(
  revision: number,
  options: DashboardProfileWriteOptions
): Promise<DashboardProfileWriteResult> {
  if (isHomeAssistantPanelMode()) {
    return unavailableWriteResult();
  }

  try {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    applyWriteHeaders(headers, options);
    const response = await fetch(
      resolveAddonLocalEndpointUrl(`${DASHBOARD_PROFILE_ENDPOINTS.revisions}/${revision}/restore`),
      {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers,
        body: '{}',
      }
    );
    const metadata = readResponseMetadata(response);
    return {
      saved: response.ok,
      unauthorized: response.status === 401,
      failureCode: readProfileErrorCode(response),
      permanentFailure: isPermanentProfileFailure(response.status),
      preconditionFailed: response.status === 412,
      preconditionRequired: response.status === 428,
      ...metadata,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to restore dashboard profile revision:', error);
    return { ...unavailableWriteResult(), permanentFailure: false };
  }
}

function preferenceEndpoint(scope: DashboardPreferenceScope): string {
  return scope === 'account'
    ? DASHBOARD_PROFILE_ENDPOINTS.accountPreferences
    : DASHBOARD_PROFILE_ENDPOINTS.clientPreferences;
}

export async function loadDashboardPreferences<TValues extends object = Record<string, unknown>>(
  scope: DashboardPreferenceScope,
  options: Pick<DashboardPreferenceOptions, 'author' | 'client'> = {}
): Promise<DashboardPreferenceLoadResult<TValues>> {
  if (isHomeAssistantPanelMode()) {
    return { available: false, unauthorized: false, failureCode: null, document: null };
  }

  const headers = new Headers();
  applyClientHeaders(headers, options.author ?? options.client);
  const result = await fetchProfileJson<DashboardPreferenceDocument<TValues>>(
    preferenceEndpoint(scope),
    { headers }
  );
  if (!result) {
    return { available: false, unauthorized: false, failureCode: null, document: null };
  }

  return {
    available: result.response.ok || result.response.status === 204,
    unauthorized: result.response.status === 401,
    failureCode: readProfileErrorCode(result.response),
    document: result.response.ok ? result.body : null,
  };
}

export async function saveDashboardPreferences<TValues extends object = Record<string, unknown>>(
  scope: DashboardPreferenceScope,
  values: TValues,
  baseRevisionOrOptions:
    | number
    | (DashboardPreferenceOptions & { schemaVersion: number })
    | undefined = undefined,
  writeOptions: Omit<DashboardPreferenceOptions, 'baseRevision'> & { schemaVersion?: number } = {}
): Promise<DashboardPreferenceWriteResult<TValues>> {
  if (isHomeAssistantPanelMode()) {
    return {
      saved: false,
      unauthorized: false,
      failureCode: null,
      permanentFailure: true,
      preconditionFailed: false,
      preconditionRequired: false,
      document: null,
    };
  }

  const options: DashboardPreferenceOptions & { schemaVersion: number } =
    typeof baseRevisionOrOptions === 'object' && baseRevisionOrOptions !== null
      ? baseRevisionOrOptions
      : {
          ...writeOptions,
          baseRevision: baseRevisionOrOptions,
          schemaVersion: writeOptions.schemaVersion ?? 1,
        };
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  applyClientHeaders(headers, options.author ?? options.client);
  if (options.baseRevision !== undefined) {
    headers.set(DASHBOARD_PROFILE_HEADERS.baseRevision, String(options.baseRevision));
  }
  const result = await fetchProfileJson<DashboardPreferenceDocument<TValues>>(
    preferenceEndpoint(scope),
    {
      method: 'PUT',
      headers,
      keepalive: options.keepalive,
      body: JSON.stringify({ schemaVersion: options.schemaVersion, values }),
    }
  );
  if (!result) {
    return {
      saved: false,
      unauthorized: false,
      failureCode: null,
      permanentFailure: false,
      preconditionFailed: false,
      preconditionRequired: false,
      document: null,
    };
  }

  return {
    saved: result.response.ok,
    unauthorized: result.response.status === 401,
    failureCode: readProfileErrorCode(result.response),
    permanentFailure: isPermanentProfileFailure(result.response.status),
    preconditionFailed: result.response.status === 412,
    preconditionRequired: result.response.status === 428,
    document: result.response.ok ? result.body : null,
  };
}

export async function listDashboardClients(
  client?: DashboardProfileClient
): Promise<DashboardClientRegistryResponse | null> {
  const headers = new Headers();
  applyClientHeaders(headers, client);
  const result = await fetchProfileJson<DashboardClientRegistryResponse>(
    DASHBOARD_PROFILE_ENDPOINTS.clients,
    { headers }
  );
  return result?.response.ok ? result.body : null;
}

export async function touchDashboardClient(
  client: DashboardProfileClient
): Promise<DashboardClientRegistryResponse | null> {
  return (await touchDashboardClientWithStatus(client)).registry;
}

export async function touchDashboardClientWithStatus(
  client: DashboardProfileClient
): Promise<DashboardClientTouchResult> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  applyClientHeaders(headers, client);
  const result = await fetchProfileJson<DashboardClientRegistryResponse>(
    DASHBOARD_PROFILE_ENDPOINTS.clients,
    { method: 'PUT', headers, body: '{}' }
  );
  return {
    failureCode: result ? readProfileErrorCode(result.response) : null,
    registry: result?.response.ok ? result.body : null,
  };
}

export async function forgetDashboardClient(
  clientId: string,
  client: DashboardProfileClient
): Promise<boolean> {
  const headers = new Headers();
  applyClientHeaders(headers, client);
  const result = await fetchProfileJson<Record<string, unknown>>(
    `${DASHBOARD_PROFILE_ENDPOINTS.clients}/${encodeURIComponent(clientId)}`,
    { method: 'DELETE', headers }
  );
  return result?.response.ok ?? false;
}

export const loadDashboardProfileHistory = listDashboardProfileHistory;
export const loadDashboardProfileClients = listDashboardClients;
export const forgetDashboardProfileClient = forgetDashboardClient;
