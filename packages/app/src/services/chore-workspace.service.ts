import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import {
  type ChoreInterchangeDocument,
  parseChoreInterchangeDocument,
} from '@navet/core/chore-interchange';
import {
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreWorkspaceAction,
  migrateChoreWorkspaceData,
} from '@navet/core/chores';
import {
  CHORE_WORKSPACE_ENDPOINTS,
  CHORE_WORKSPACE_HEADERS,
  type ChoreAutomationEvent,
  type ChoreDefinitionListDocument,
  type ChoreEventFeedDocument,
  type ChoreHistoryDocument,
  type ChoreManagementPinRequest,
  type ChoreManagementSessionDocument,
  type ChoreManagementVerifyRequest,
  type ChoreOccurrenceListDocument,
  type ChoreWorkspaceCommandRequest,
  type ChoreWorkspaceDocument,
  type ChoreWorkspaceRecoveryInfo,
  type ChoreWorkspaceRecoveryRequest,
  type ChoreWorkspaceResetRequest,
  type ChoreWorkspaceRestoreRequest,
} from './chore-workspace.contract';

export interface ChoreWorkspaceLoadResult {
  available: boolean;
  unauthorized: boolean;
  notModified: boolean;
  error: string | null;
  recovery: ChoreWorkspaceRecoveryInfo | null;
  revision: number | null;
  document: ChoreWorkspaceDocument | null;
}

export interface ChoreWorkspaceCommandResult {
  saved: boolean;
  unauthorized: boolean;
  preconditionFailed: boolean;
  error: string | null;
  revision: number | null;
  document: ChoreWorkspaceDocument | null;
  retryable?: boolean;
}

export interface ChoreAutomationReadResult<T> {
  available: boolean;
  unauthorized: boolean;
  value: T | null;
}

function endpointWithQuery(endpoint: string, query: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && String(value).length > 0) search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `${endpoint}?${serialized}` : endpoint;
}

async function loadAutomationResource<T>(endpoint: string): Promise<ChoreAutomationReadResult<T>> {
  if (isHomeAssistantPanelMode()) {
    return { available: false, unauthorized: false, value: null };
  }
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(endpoint), {
      credentials: 'same-origin',
    });
    if (response.status === 401 || response.status === 403) {
      return { available: false, unauthorized: true, value: null };
    }
    if (!response.ok) return { available: false, unauthorized: false, value: null };
    return { available: true, unauthorized: false, value: (await response.json()) as T };
  } catch {
    return { available: false, unauthorized: false, value: null };
  }
}

export async function loadChoreDefinitions(): Promise<
  ChoreAutomationReadResult<{ revision: number; definitions: ChoreDefinition[] }>
> {
  const result = await loadAutomationResource<ChoreDefinitionListDocument>(
    CHORE_WORKSPACE_ENDPOINTS.definitions
  );
  return {
    ...result,
    value: result.value
      ? { revision: result.value.revision, definitions: result.value.definitions }
      : null,
  };
}

export async function loadChoreOccurrences(
  filters: { from?: string; to?: string; participantId?: string; definitionId?: string } = {}
): Promise<ChoreAutomationReadResult<{ revision: number; occurrences: ChoreOccurrence[] }>> {
  const result = await loadAutomationResource<ChoreOccurrenceListDocument>(
    endpointWithQuery(CHORE_WORKSPACE_ENDPOINTS.occurrences, filters)
  );
  return {
    ...result,
    value: result.value
      ? { revision: result.value.revision, occurrences: result.value.occurrences }
      : null,
  };
}

export async function loadChoreEvents(
  filters: {
    after?: string;
    limit?: number;
    types?: string;
    occurrenceId?: string;
    definitionId?: string;
  } = {}
): Promise<
  ChoreAutomationReadResult<{
    cursor: string;
    hasMore: boolean;
    events: ChoreAutomationEvent[];
  }>
> {
  const result = await loadAutomationResource<ChoreEventFeedDocument>(
    endpointWithQuery(CHORE_WORKSPACE_ENDPOINTS.events, filters)
  );
  return {
    ...result,
    value: result.value
      ? {
          cursor: result.value.cursor,
          hasMore: result.value.hasMore,
          events: result.value.events,
        }
      : null,
  };
}

export async function loadChoreHistory(): Promise<ChoreAutomationReadResult<ChoreHistoryDocument>> {
  return loadAutomationResource<ChoreHistoryDocument>(CHORE_WORKSPACE_ENDPOINTS.history);
}

export async function loadChoreBackup(): Promise<
  ChoreAutomationReadResult<ChoreInterchangeDocument>
> {
  const result = await loadAutomationResource<unknown>(CHORE_WORKSPACE_ENDPOINTS.backup);
  if (!result.value) return { ...result, value: null };
  try {
    return { ...result, value: parseChoreInterchangeDocument(result.value) };
  } catch {
    return { available: false, unauthorized: false, value: null };
  }
}

async function sendChoreAdministrationRequest(
  endpoint: string,
  request: ChoreWorkspaceRestoreRequest | ChoreWorkspaceResetRequest
): Promise<ChoreWorkspaceCommandResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore workspace administration is unavailable in Home Assistant panel mode',
      revision: null,
      document: null,
    };
  }
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(endpoint), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        [CHORE_WORKSPACE_HEADERS.baseRevision]: String(request.baseRevision),
        ...(request.managementSessionToken
          ? {
              [CHORE_WORKSPACE_HEADERS.managementSession]: request.managementSessionToken,
            }
          : {}),
      },
      body: JSON.stringify(request),
    });
    const document = response.ok ? await parseDocument(response) : null;
    return {
      saved: response.ok && document !== null,
      unauthorized: response.status === 401,
      preconditionFailed: response.status === 412,
      error: response.ok ? null : await parseError(response),
      revision: document?.revision ?? parseRevision(response),
      document,
      retryable: response.status >= 500,
    };
  } catch {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore workspace administration failed',
      revision: null,
      document: null,
      retryable: true,
    };
  }
}

export function restoreChoreWorkspace(request: ChoreWorkspaceRestoreRequest) {
  return sendChoreAdministrationRequest(CHORE_WORKSPACE_ENDPOINTS.restore, request);
}

export function resetChoreWorkspace(request: ChoreWorkspaceResetRequest) {
  return sendChoreAdministrationRequest(CHORE_WORKSPACE_ENDPOINTS.reset, request);
}

export interface ChoreManagementSessionResult {
  unlocked: boolean;
  unauthorized: boolean;
  error: string | null;
  document: ChoreManagementSessionDocument | null;
}

async function sendChoreManagementRequest(
  endpoint: string,
  request: ChoreManagementPinRequest | ChoreManagementVerifyRequest,
  managementSessionToken?: string
): Promise<ChoreManagementSessionResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      unlocked: false,
      unauthorized: false,
      error: 'Chore management is unavailable in Home Assistant panel mode',
      document: null,
    };
  }
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(endpoint), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(managementSessionToken
          ? {
              [CHORE_WORKSPACE_HEADERS.managementSession]: managementSessionToken,
            }
          : {}),
      },
      body: JSON.stringify(request),
    });
    const document = response.ok
      ? ((await response.json()) as ChoreManagementSessionDocument)
      : null;
    return {
      unlocked: response.ok && Boolean(document?.sessionToken),
      unauthorized: response.status === 401 || response.status === 403 || response.status === 429,
      error: response.ok ? null : await parseError(response),
      document,
    };
  } catch {
    return {
      unlocked: false,
      unauthorized: false,
      error: 'Chore management could not be unlocked',
      document: null,
    };
  }
}

export function configureChoreManagementPin(
  request: ChoreManagementPinRequest,
  managementSessionToken?: string
) {
  return sendChoreManagementRequest(
    CHORE_WORKSPACE_ENDPOINTS.managementPin,
    request,
    managementSessionToken
  );
}

export function verifyChoreManagementPin(request: ChoreManagementVerifyRequest) {
  return sendChoreManagementRequest(CHORE_WORKSPACE_ENDPOINTS.managementVerify, request);
}

function parseRevision(response: Response) {
  const revision = Number.parseInt(
    response.headers.get(CHORE_WORKSPACE_HEADERS.revision) ?? '',
    10
  );
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}

async function parseDocument(response: Response): Promise<ChoreWorkspaceDocument | null> {
  try {
    const body = (await response.json()) as Partial<ChoreWorkspaceDocument>;
    if (
      typeof body.revision !== 'number' ||
      !Number.isSafeInteger(body.revision) ||
      typeof body.updatedAt !== 'string'
    ) {
      return null;
    }
    return {
      revision: body.revision,
      updatedAt: body.updatedAt,
      data: migrateChoreWorkspaceData(body.data),
      management: {
        pinConfigured: body.management?.pinConfigured === true,
      },
    };
  } catch {
    return null;
  }
}

async function parseError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' && body.error.trim() ? body.error : null;
  } catch {
    return null;
  }
}

async function parseWorkspaceFailure(response: Response): Promise<{
  error: string | null;
  recovery: ChoreWorkspaceRecoveryInfo | null;
}> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      recovery?: Partial<ChoreWorkspaceRecoveryInfo>;
    };
    const recovery = body.recovery;
    const reason = recovery?.reason;
    return {
      error: typeof body.error === 'string' && body.error.trim() ? body.error : null,
      recovery:
        typeof recovery?.backupAvailable === 'boolean' &&
        typeof recovery.pinConfigured === 'boolean' &&
        (reason === 'storage_unavailable' ||
          reason === 'workspace_invalid' ||
          reason === 'workspace_too_large')
          ? {
              backupAvailable: recovery.backupAvailable,
              pinConfigured: recovery.pinConfigured,
              reason,
            }
          : null,
    };
  } catch {
    return { error: null, recovery: null };
  }
}

export async function loadChoreWorkspace(revision?: number): Promise<ChoreWorkspaceLoadResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      available: false,
      unauthorized: false,
      notModified: false,
      error: 'Chores are not available in Home Assistant panel mode',
      recovery: null,
      revision: null,
      document: null,
    };
  }

  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(CHORE_WORKSPACE_ENDPOINTS.current), {
      credentials: 'same-origin',
      headers:
        revision === undefined
          ? undefined
          : { [CHORE_WORKSPACE_HEADERS.revision]: String(revision) },
    });
    if (response.status === 304) {
      return {
        available: true,
        unauthorized: false,
        notModified: true,
        error: null,
        recovery: null,
        revision: parseRevision(response) ?? revision ?? null,
        document: null,
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        available: false,
        unauthorized: true,
        notModified: false,
        error: 'Authentication is required to load chores',
        recovery: null,
        revision: parseRevision(response),
        document: null,
      };
    }
    if (!response.ok) {
      const failure = await parseWorkspaceFailure(response);
      return {
        available: false,
        unauthorized: false,
        notModified: false,
        error: failure.error,
        recovery: failure.recovery,
        revision: parseRevision(response),
        document: null,
      };
    }

    const document = await parseDocument(response);
    return {
      available: document !== null,
      unauthorized: false,
      notModified: false,
      error: document ? null : 'The chore workspace response was invalid',
      recovery: null,
      revision: document?.revision ?? parseRevision(response),
      document,
    };
  } catch {
    return {
      available: false,
      unauthorized: false,
      notModified: false,
      error: 'Chore storage could not be reached',
      recovery: null,
      revision: null,
      document: null,
    };
  }
}

export async function recoverChoreWorkspace(
  request: ChoreWorkspaceRecoveryRequest
): Promise<ChoreWorkspaceCommandResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore recovery is unavailable in Home Assistant panel mode',
      revision: null,
      document: null,
    };
  }
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(CHORE_WORKSPACE_ENDPOINTS.recovery), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(request.managementSessionToken
          ? {
              [CHORE_WORKSPACE_HEADERS.managementSession]: request.managementSessionToken,
            }
          : {}),
      },
      body: JSON.stringify({ action: request.action, confirmation: request.confirmation }),
    });
    const document = response.ok ? await parseDocument(response) : null;
    return {
      saved: response.ok && document !== null,
      unauthorized: response.status === 401,
      preconditionFailed: false,
      error: response.ok ? null : await parseError(response),
      revision: document?.revision ?? parseRevision(response),
      document,
    };
  } catch {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore recovery could not be completed',
      revision: null,
      document: null,
    };
  }
}

export async function sendChoreWorkspaceCommand(
  request: ChoreWorkspaceCommandRequest
): Promise<ChoreWorkspaceCommandResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore workspace actions are unavailable in Home Assistant panel mode',
      revision: null,
      document: null,
    };
  }

  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(CHORE_WORKSPACE_ENDPOINTS.commands), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        [CHORE_WORKSPACE_HEADERS.baseRevision]: String(request.baseRevision),
        ...(request.managementSessionToken
          ? {
              [CHORE_WORKSPACE_HEADERS.managementSession]: request.managementSessionToken,
            }
          : {}),
      },
      body: JSON.stringify(request),
    });
    const document = response.ok ? await parseDocument(response) : null;
    const error = response.ok ? null : await parseError(response);
    return {
      saved: response.ok && document !== null,
      unauthorized: response.status === 401,
      preconditionFailed: response.status === 412,
      error,
      revision: document?.revision ?? parseRevision(response),
      document,
      retryable: response.status >= 500,
    };
  } catch {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'Chore workspace sync failed',
      revision: null,
      document: null,
      retryable: true,
    };
  }
}

export function createChoreWorkspaceCommandRequest(input: {
  commandId: string;
  baseRevision: number;
  action: ChoreWorkspaceAction;
  managementSessionToken?: string;
}): ChoreWorkspaceCommandRequest {
  return input;
}
