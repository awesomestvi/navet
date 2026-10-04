// Linear timestamps and runner timestamps come from different clocks. This bounded allowance
// applies only across those clocks; ordering within Linear and local freshness remain strict.
export const LINEAR_RESULT_CLOCK_SKEW_MS = 30_000;

export function linearResultTimesMatch({ createdAt, updatedAt, notBefore, observedAt }) {
  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string' ||
      !Number.isSafeInteger(notBefore) || notBefore <= 0 ||
      !Number.isSafeInteger(observedAt) || observedAt < notBefore) return false;
  const created = Date.parse(createdAt);
  const updated = Date.parse(updatedAt);
  return Number.isFinite(created) && created > 0 && Number.isFinite(updated) && updated >= created &&
    created >= notBefore - LINEAR_RESULT_CLOCK_SKEW_MS && updated <= observedAt + LINEAR_RESULT_CLOCK_SKEW_MS;
}
