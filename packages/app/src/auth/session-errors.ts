export class DurableAuthSessionUnavailableError extends Error {
  override name = 'StandaloneOAuthSessionUnavailableError';
}

export function isDurableAuthSessionUnavailableError(
  error: unknown
): error is DurableAuthSessionUnavailableError {
  return error instanceof DurableAuthSessionUnavailableError;
}
