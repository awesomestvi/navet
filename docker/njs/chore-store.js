import fs from 'fs';
import authStore from './auth-store.js';
import providerSessionStore from './provider-session-store.js';

const CONTRACT_VERSION = 1;
const SCHEMA_VERSION = 1;
const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const CHORE_WORKSPACE_PATH = '/data/navet-chore-workspace.json';
const CHORE_JOURNAL_PATH = '/data/navet-chore-command-journal.json';
const MAX_WORKSPACE_BYTES = 128 * 1024;
const MAX_CHORE_WORKSPACE_BYTES = 2 * 1024 * 1024;
const MAX_CHORE_JOURNAL_BYTES = 512 * 1024;
const MAX_ACTIVITY_ITEMS = 5000;
const MAX_COMMAND_JOURNAL_ITEMS = 500;
const TENANT_ID_PATTERN = /^hat_[a-f0-9]{64}$/;

const HEADERS = {
  revision: 'X-Navet-Chore-Revision',
  baseRevision: 'X-Navet-Base-Revision',
};

let fsModule = fs;
let principalResolver = function (r, options) {
  if (!authStore || typeof authStore.resolveAuthenticatedPrincipal !== 'function') {
    return null;
  }
  return authStore.resolveAuthenticatedPrincipal(r, options);
};

function setChoreStoreFsForTests(mockFs) {
  fsModule = mockFs;
}

function setChoreStorePrincipalResolverForTests(resolver) {
  principalResolver = resolver;
}

function resetChoreStoreForTests() {
  fsModule = fs;
  principalResolver = function (r, options) {
    if (!authStore || typeof authStore.resolveAuthenticatedPrincipal !== 'function') {
      return null;
    }
    return authStore.resolveAuthenticatedPrincipal(r, options);
  };
}

function nowIso() {
  return new Date().toISOString();
}

function createOpaqueId(prefix) {
  const timestamp = Date.now().toString(36);
  let random = '';
  for (let index = 0; index < 4; index += 1) {
    random += Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}_${timestamp}${random}`.slice(0, 52);
}

function getHeader(r, name) {
  const headers = (r && r.headersIn) || {};
  if (headers[name] !== undefined) {
    return headers[name];
  }
  const lowerName = name.toLowerCase();
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key) && key.toLowerCase() === lowerName) {
      return headers[key];
    }
  }
  return '';
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function readJson(path, fallback, maxBytes) {
  try {
    if (fsModule.statSync(path).size > maxBytes) {
      throw new Error('Chore storage exceeds its safe read limit');
    }
    return JSON.parse(fsModule.readFileSync(path, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

function writeJson(path, value, maxBytes) {
  const serialized = JSON.stringify(value);
  if (serialized.length > maxBytes) {
    const error = new Error('Chore workspace is too large');
    error.code = 'NAVET_CHORE_WRITE_LIMIT';
    throw error;
  }
  const temporaryPath = path + '.tmp';
  fsModule.writeFileSync(temporaryPath, serialized, 'utf8');
  fsModule.renameSync(temporaryPath, path);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidTenantBinding(value) {
  return (
    isRecord(value) &&
    value.providerId === 'home_assistant' &&
    typeof value.tenantId === 'string' &&
    TENANT_ID_PATTERN.test(value.tenantId) &&
    typeof value.enrolledAt === 'string' &&
    Number.isFinite(Date.parse(value.enrolledAt))
  );
}

function isValidWorkspace(value) {
  return (
    isRecord(value) &&
    value.contractVersion === CONTRACT_VERSION &&
    typeof value.installationId === 'string' &&
    value.installationId.length > 4 &&
    typeof value.workspaceId === 'string' &&
    value.workspaceId.length > 4 &&
    value.defaultProfileId === 'default' &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    (value.tenantBinding === undefined || isValidTenantBinding(value.tenantBinding))
  );
}

function readOrCreateWorkspace() {
  const missing = {};
  const current = readJson(WORKSPACE_PATH, missing, MAX_WORKSPACE_BYTES);
  if (current !== missing) {
    if (!isValidWorkspace(current)) {
      throw new Error('Dashboard workspace is invalid');
    }
    return current;
  }
  const workspace = {
    contractVersion: CONTRACT_VERSION,
    installationId: createOpaqueId('nvi'),
    workspaceId: createOpaqueId('nvw'),
    defaultProfileId: 'default',
    createdAt: nowIso(),
  };
  writeJson(WORKSPACE_PATH, workspace, MAX_WORKSPACE_BYTES);
  return workspace;
}

function authorizeWorkspacePrincipal(principal) {
  if (
    !principal ||
    principal.providerId !== 'home_assistant' ||
    typeof principal.tenantId !== 'string' ||
    !TENANT_ID_PATTERN.test(principal.tenantId)
  ) {
    return null;
  }

  const workspace = readOrCreateWorkspace();
  if (workspace.tenantBinding === undefined) {
    const enrolled = Object.assign({}, workspace, {
      tenantBinding: {
        providerId: 'home_assistant',
        tenantId: principal.tenantId,
        enrolledAt: nowIso(),
      },
    });
    writeJson(WORKSPACE_PATH, enrolled, MAX_WORKSPACE_BYTES);
    return enrolled;
  }
  return workspace.tenantBinding.tenantId === principal.tenantId ? workspace : null;
}

function isValidActivity(value) {
  return (
    isRecord(value) &&
    typeof value.commandId === 'string' &&
    value.commandId.length > 0 &&
    value.commandId.length <= 200 &&
    (value.occurrenceId === undefined || typeof value.occurrenceId === 'string') &&
    (value.definitionId === undefined || typeof value.definitionId === 'string') &&
    (value.participantId === undefined || typeof value.participantId === 'string') &&
    (value.actorParticipantId === undefined || typeof value.actorParticipantId === 'string') &&
    typeof value.type === 'string' &&
    typeof value.timestamp === 'string' &&
    Number.isFinite(Date.parse(value.timestamp))
  );
}

function isValidChoreWorkspaceData(value) {
  if (
    !isRecord(value) ||
    value.schemaVersion !== SCHEMA_VERSION ||
    !isRecord(value.participantsById) ||
    !isRecord(value.definitionsById) ||
    !isRecord(value.occurrencesById) ||
    !Array.isArray(value.activity) ||
    value.activity.length > MAX_ACTIVITY_ITEMS
  ) {
    return false;
  }
  for (let index = 0; index < value.activity.length; index += 1) {
    if (!isValidActivity(value.activity[index])) {
      return false;
    }
  }
  return true;
}

function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    participantsById: {},
    definitionsById: {},
    occurrencesById: {},
    activity: [],
  };
}

function isValidDocument(value) {
  return (
    isRecord(value) &&
    value.contractVersion === CONTRACT_VERSION &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    isValidChoreWorkspaceData(value.data)
  );
}

function readDocument() {
  const missing = {};
  const document = readJson(CHORE_WORKSPACE_PATH, missing, MAX_CHORE_WORKSPACE_BYTES);
  if (document === missing) {
    return {
      contractVersion: CONTRACT_VERSION,
      revision: 0,
      updatedAt: nowIso(),
      data: emptyData(),
    };
  }
  if (!isValidDocument(document)) {
    throw new Error('Chore workspace document is invalid');
  }
  return document;
}

function readJournal() {
  const journal = readJson(
    CHORE_JOURNAL_PATH,
    { contractVersion: CONTRACT_VERSION, commands: [] },
    MAX_CHORE_JOURNAL_BYTES
  );
  if (
    !isRecord(journal) ||
    journal.contractVersion !== CONTRACT_VERSION ||
    !Array.isArray(journal.commands)
  ) {
    throw new Error('Chore command journal is invalid');
  }
  return journal;
}

function applyRevisionHeader(r, revision) {
  r.headersOut[HEADERS.revision] = String(revision);
}

function publicDocument(document) {
  return {
    revision: document.revision,
    updatedAt: document.updatedAt,
    data: document.data,
  };
}

function loadWorkspace(r) {
  const document = readDocument();
  applyRevisionHeader(r, document.revision);
  const clientRevision = Number.parseInt(getHeader(r, HEADERS.revision), 10);
  if (Number.isSafeInteger(clientRevision) && clientRevision === document.revision) {
    r.headersOut['Cache-Control'] = 'no-store';
    r.return(304);
    return;
  }
  sendJson(r, 200, publicDocument(document));
}

function hasCommand(document, journal, commandId) {
  for (let index = 0; index < document.data.activity.length; index += 1) {
    if (document.data.activity[index].commandId === commandId) {
      return true;
    }
  }
  for (let index = 0; index < journal.commands.length; index += 1) {
    if (journal.commands[index] && journal.commands[index].commandId === commandId) {
      return true;
    }
  }
  return false;
}

function commitCommand(r) {
  const body = r.requestText || '';
  if (!body || body.length > MAX_CHORE_WORKSPACE_BYTES) {
    sendJson(r, 413, { error: 'Chore command is too large' });
    return;
  }

  let request;
  try {
    request = JSON.parse(body);
  } catch (_error) {
    sendJson(r, 400, { error: 'Chore command must be valid JSON' });
    return;
  }

  const baseRevision = Number.parseInt(getHeader(r, HEADERS.baseRevision), 10);
  if (
    !isRecord(request) ||
    typeof request.commandId !== 'string' ||
    request.commandId.length === 0 ||
    request.commandId.length > 200 ||
    !Number.isSafeInteger(request.baseRevision) ||
    request.baseRevision !== baseRevision ||
    !isValidChoreWorkspaceData(request.data)
  ) {
    sendJson(r, 400, { error: 'Chore command is invalid' });
    return;
  }

  const current = readDocument();
  const journal = readJournal();
  applyRevisionHeader(r, current.revision);
  if (hasCommand(current, journal, request.commandId)) {
    sendJson(r, 200, publicDocument(current));
    return;
  }
  if (baseRevision !== current.revision) {
    sendJson(r, 412, {
      error: 'Chore workspace changed on another client',
      revision: current.revision,
    });
    return;
  }

  const commandActivity = request.data.activity.filter(function (activity) {
    return activity.commandId === request.commandId;
  });
  if (commandActivity.length !== 1) {
    sendJson(r, 400, { error: 'Chore command must include one matching activity entry' });
    return;
  }

  const next = {
    contractVersion: CONTRACT_VERSION,
    revision: current.revision + 1,
    updatedAt: nowIso(),
    data: request.data,
  };
  const nextJournal = {
    contractVersion: CONTRACT_VERSION,
    commands: journal.commands
      .concat([
        {
          commandId: request.commandId,
          revision: next.revision,
          timestamp: next.updatedAt,
        },
      ])
      .slice(-MAX_COMMAND_JOURNAL_ITEMS),
  };
  writeJson(CHORE_WORKSPACE_PATH, next, MAX_CHORE_WORKSPACE_BYTES);
  writeJson(CHORE_JOURNAL_PATH, nextJournal, MAX_CHORE_JOURNAL_BYTES);
  applyRevisionHeader(r, next.revision);
  sendJson(r, 200, publicDocument(next));
}

function routeRequest(r, principal) {
  if (!authorizeWorkspacePrincipal(principal)) {
    sendJson(r, 403, { error: 'This chore workspace belongs to another installation' });
    return;
  }
  if (r.method !== 'GET' && !providerSessionStore.isStrictSameOriginMutation(r)) {
    sendJson(r, 403, { error: 'Cross-origin chore mutation is not allowed' });
    return;
  }

  const uri = typeof r.uri === 'string' ? r.uri.replace(/\/+$/, '') : '';
  if (uri === '/__navet_chores__/workspace' && r.method === 'GET') {
    loadWorkspace(r);
    return;
  }
  if (uri === '/__navet_chores__/commands' && r.method === 'POST') {
    commitCommand(r);
    return;
  }
  sendJson(r, 404, { error: 'Chore workspace resource not found' });
}

function handleWithOptions(r, options) {
  const principal = principalResolver(r, {
    trustIngressHeaders: Boolean(options && options.trustIngressHeaders),
  });
  if (!principal) {
    sendJson(r, 401, { error: 'Authentication required' });
    return;
  }
  try {
    routeRequest(r, principal);
  } catch (error) {
    if (error && error.code === 'NAVET_CHORE_WRITE_LIMIT') {
      sendJson(r, 413, { error: 'Chore workspace is too large' });
      return;
    }
    sendJson(r, 503, { error: 'Chore workspace storage is unavailable' });
  }
}

function handle(r) {
  handleWithOptions(r, { trustIngressHeaders: false });
}

function handleIngress(r) {
  handleWithOptions(r, { trustIngressHeaders: true });
}

export default {
  handle,
  handleIngress,
  isValidChoreWorkspaceData,
  resetChoreStoreForTests,
  routeRequest,
  setChoreStoreFsForTests,
  setChoreStorePrincipalResolverForTests,
};
