import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';

type JsonRecord = Record<string, unknown>;

export interface DashboardProfileMergeResult {
  localChangedPaths: string[];
  overlappingPaths: string[];
  profile: DashboardConfigPayload | null;
  remoteChangedPaths: string[];
}

const IGNORED_ROOT_KEYS = new Set(['cardOrders', 'exportedAt', 'navigation']);

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function unescapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function toPointer(segments: string[]): string {
  return `/${segments.map(escapeJsonPointerSegment).join('/')}`;
}

function fromPointer(pointer: string): string[] {
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid dashboard profile path: ${pointer}`);
  }
  return pointer.slice(1).split('/').filter(Boolean).map(unescapeJsonPointerSegment);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (isJsonRecord(left) || isJsonRecord(right)) {
    if (!isJsonRecord(left) || !isJsonRecord(right)) {
      return false;
    }
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return Array.from(keys).every(
      (key) =>
        Object.hasOwn(left, key) === Object.hasOwn(right, key) && valuesEqual(left[key], right[key])
    );
  }
  return false;
}

function collectChangedPaths(
  base: unknown,
  next: unknown,
  segments: string[],
  changedPaths: string[]
) {
  if (valuesEqual(base, next)) {
    return;
  }
  if (isJsonRecord(base) && isJsonRecord(next)) {
    const keys = new Set([...Object.keys(base), ...Object.keys(next)]);
    for (const key of Array.from(keys).sort()) {
      if (segments.length === 0 && IGNORED_ROOT_KEYS.has(key)) {
        continue;
      }
      collectChangedPaths(base[key], next[key], [...segments, key], changedPaths);
    }
    return;
  }
  if (segments.length > 0) {
    changedPaths.push(toPointer(segments));
  }
}

export function getDashboardProfileChangedPaths(
  base: DashboardConfigPayload,
  next: DashboardConfigPayload
): string[] {
  const changedPaths: string[] = [];
  collectChangedPaths(base, next, [], changedPaths);
  return changedPaths;
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function getOverlappingDashboardProfilePaths(
  localPaths: readonly string[],
  remotePaths: readonly string[]
): string[] {
  return Array.from(
    new Set(
      localPaths.flatMap((localPath) =>
        remotePaths.some((remotePath) => pathsOverlap(localPath, remotePath)) ? [localPath] : []
      )
    )
  ).sort();
}

function readValueAtPath(value: unknown, segments: readonly string[]) {
  let current = value;
  for (const segment of segments) {
    if (!isJsonRecord(current) || !Object.hasOwn(current, segment)) {
      return { exists: false, value: undefined };
    }
    current = current[segment];
  }
  return { exists: true, value: current };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyValueAtPath(target: JsonRecord, source: JsonRecord, pointer: string) {
  const segments = fromPointer(pointer);
  if (segments.length === 0) {
    return;
  }

  const sourceValue = readValueAtPath(source, segments);
  let targetParent = target;
  for (const segment of segments.slice(0, -1)) {
    const current = targetParent[segment];
    if (!isJsonRecord(current)) {
      targetParent[segment] = {};
    }
    targetParent = targetParent[segment] as JsonRecord;
  }

  const key = segments.at(-1);
  if (!key) {
    return;
  }
  if (sourceValue.exists) {
    targetParent[key] = cloneJson(sourceValue.value);
  } else {
    delete targetParent[key];
  }
}

export function rebaseLocalDashboardProfile(
  base: DashboardConfigPayload,
  local: DashboardConfigPayload,
  remote: DashboardConfigPayload
): DashboardConfigPayload {
  const rebased = cloneJson(remote) as unknown as JsonRecord;
  const localRecord = local as unknown as JsonRecord;
  for (const path of getDashboardProfileChangedPaths(base, local)) {
    applyValueAtPath(rebased, localRecord, path);
  }
  return rebased as unknown as DashboardConfigPayload;
}

export function mergeDashboardProfiles(
  base: DashboardConfigPayload,
  local: DashboardConfigPayload,
  remote: DashboardConfigPayload
): DashboardProfileMergeResult {
  const localChangedPaths = getDashboardProfileChangedPaths(base, local);
  const remoteChangedPaths = getDashboardProfileChangedPaths(base, remote);
  const overlappingPaths = getOverlappingDashboardProfilePaths(
    localChangedPaths,
    remoteChangedPaths
  );
  if (overlappingPaths.length > 0) {
    return {
      localChangedPaths,
      overlappingPaths,
      profile: null,
      remoteChangedPaths,
    };
  }

  return {
    localChangedPaths,
    overlappingPaths: [],
    profile: rebaseLocalDashboardProfile(base, local, remote),
    remoteChangedPaths,
  };
}
