interface NavetRuntimeConfig {
  hassUrl?: string;
  dashboardConfigUrl?: string;
  proxyBaseUrl?: string;
}

function normalizeValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUrl(url: string | undefined): string | undefined {
  const normalized = normalizeValue(url);
  if (!normalized) {
    return undefined;
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function getRuntimeConfig(): NavetRuntimeConfig {
  const runtimeConfig = window.__NAVET_CONFIG__ ?? {};

  return {
    hassUrl: normalizeUrl(runtimeConfig.hassUrl),
    dashboardConfigUrl: normalizeValue(runtimeConfig.dashboardConfigUrl),
    proxyBaseUrl: normalizeUrl(runtimeConfig.proxyBaseUrl),
  };
}
