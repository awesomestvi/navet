import { integrationSessionRuntime } from './integration-session-runtime';
import type { AuthRuntime } from './runtime-types';

export type { AuthRuntime } from './runtime-types';

export function detectAuthRuntime(): AuthRuntime {
  return integrationSessionRuntime.getAuthRuntime();
}
