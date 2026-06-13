let previousDecisionSignatures = new Map<string, string>();

function canLogPerformanceDiagnostics() {
  return import.meta.env.DEV;
}

export function logPerformanceDecision(label: string, payload: Record<string, unknown>) {
  if (!canLogPerformanceDiagnostics()) {
    return;
  }

  const signature = JSON.stringify(payload);
  const previousSignature = previousDecisionSignatures.get(label);
  if (previousSignature === signature) {
    return;
  }

  previousDecisionSignatures.set(label, signature);
  console.debug('[Navet][PerformanceDecision]', {
    label,
    ...payload,
  });
}

export function resetPerformanceDecisionLogCache() {
  previousDecisionSignatures = new Map();
}
