import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { type ChoreWorkspaceData, isChoreWorkspaceData } from '@navet/core/chores';
import {
  CHORE_WORKSPACE_ENDPOINTS,
  CHORE_WORKSPACE_HEADERS,
  type ChoreWorkspaceCommandRequest,
  type ChoreWorkspaceDocument,
} from './chore-workspace.contract';

export interface ChoreWorkspaceLoadResult {
  available: boolean;
  unauthorized: boolean;
  notModified: boolean;
  revision: number | null;
  document: ChoreWorkspaceDocument | null;
}

export interface ChoreWorkspaceCommandResult {
  saved: boolean;
  unauthorized: boolean;
  preconditionFailed: boolean;
  revision: number | null;
  document: ChoreWorkspaceDocument | null;
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
      typeof body.updatedAt !== 'string' ||
      !isChoreWorkspaceData(body.data)
    ) {
      return null;
    }
    return body as ChoreWorkspaceDocument;
  } catch {
    return null;
  }
}

export async function loadChoreWorkspace(revision?: number): Promise<ChoreWorkspaceLoadResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      available: false,
      unauthorized: false,
      notModified: false,
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
        revision: parseRevision(response) ?? revision ?? null,
        document: null,
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        available: false,
        unauthorized: true,
        notModified: false,
        revision: parseRevision(response),
        document: null,
      };
    }
    if (!response.ok) {
      return {
        available: false,
        unauthorized: false,
        notModified: false,
        revision: parseRevision(response),
        document: null,
      };
    }

    const document = await parseDocument(response);
    return {
      available: document !== null,
      unauthorized: false,
      notModified: false,
      revision: document?.revision ?? parseRevision(response),
      document,
    };
  } catch {
    return {
      available: false,
      unauthorized: false,
      notModified: false,
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
      },
      body: JSON.stringify(request),
    });
    const document = response.ok ? await parseDocument(response) : null;
    return {
      saved: response.ok && document !== null,
      unauthorized: response.status === 401 || response.status === 403,
      preconditionFailed: response.status === 412,
      revision: document?.revision ?? parseRevision(response),
      document,
    };
  } catch {
    return {
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      revision: null,
      document: null,
    };
  }
}

export function createChoreWorkspaceCommandRequest(input: {
  commandId: string;
  baseRevision: number;
  data: ChoreWorkspaceData;
}): ChoreWorkspaceCommandRequest {
  return input;
}
