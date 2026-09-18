export const APPROVAL_STATUS_CONTEXTS = Object.freeze({
  product: 'navet/product-approval',
  foundation: 'navet/foundation-approval',
  security: 'navet/security-approval',
});

export function approvalsFromStatuses(statuses = []) {
  const successfulContexts = new Set(
    statuses.filter(({ state }) => state === 'success').map(({ context }) => context)
  );

  return Object.fromEntries(
    Object.entries(APPROVAL_STATUS_CONTEXTS).map(([gate, context]) => [
      gate,
      successfulContexts.has(context),
    ])
  );
}
