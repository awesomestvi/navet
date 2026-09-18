export const APPROVAL_STATUS_CONTEXTS = Object.freeze({
  product: 'navet/product-approval',
  foundation: 'navet/foundation-approval',
  security: 'navet/security-approval',
});

export function approvalsFromStatuses(statuses = []) {
  const knownContexts = new Set(Object.values(APPROVAL_STATUS_CONTEXTS));
  const latestStates = new Map();
  for (const { context, state } of statuses) {
    if (knownContexts.has(context) && !latestStates.has(context)) {
      latestStates.set(context, state);
    }
  }

  return Object.fromEntries(
    Object.entries(APPROVAL_STATUS_CONTEXTS).map(([gate, context]) => [
      gate,
      latestStates.get(context) === 'success',
    ])
  );
}
