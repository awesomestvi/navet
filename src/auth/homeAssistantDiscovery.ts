import { resolveAddonLocalEndpointUrl } from '@/app/utils/home-assistant-connection-target';

const DISCOVERY_ENDPOINT = '/__navet_discovery__/home-assistant';

export type HomeAssistantDiscoverySource = 'env' | 'hostname' | 'mdns';

export interface HomeAssistantDiscoveryCandidate {
  url: string;
  source: HomeAssistantDiscoverySource;
  reachable: boolean;
}

export interface HomeAssistantDiscoveryResult {
  candidates: HomeAssistantDiscoveryCandidate[];
  preferredUrl?: string;
}

function isDiscoveryCandidate(value: unknown): value is HomeAssistantDiscoveryCandidate {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<HomeAssistantDiscoveryCandidate>;
  return (
    typeof candidate.url === 'string' &&
    /^https?:\/\//.test(candidate.url) &&
    (candidate.source === 'env' ||
      candidate.source === 'hostname' ||
      candidate.source === 'mdns') &&
    typeof candidate.reachable === 'boolean'
  );
}

export function parseHomeAssistantDiscoveryResult(
  value: unknown
): HomeAssistantDiscoveryResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const result = value as Partial<HomeAssistantDiscoveryResult>;
  if (!Array.isArray(result.candidates) || !result.candidates.every(isDiscoveryCandidate)) {
    return null;
  }

  return {
    candidates: result.candidates,
    preferredUrl:
      typeof result.preferredUrl === 'string' && /^https?:\/\//.test(result.preferredUrl)
        ? result.preferredUrl
        : undefined,
  };
}

export function chooseDiscoveredHomeAssistantUrl(
  result: HomeAssistantDiscoveryResult | null
): string | null {
  if (!result) {
    return null;
  }

  if (result.preferredUrl) {
    return result.preferredUrl;
  }

  const reachableCandidates = result.candidates.filter((candidate) => candidate.reachable);
  return reachableCandidates.length === 1 ? reachableCandidates[0].url : null;
}

export async function fetchHomeAssistantDiscovery(): Promise<HomeAssistantDiscoveryResult | null> {
  const response = await fetch(resolveAddonLocalEndpointUrl(DISCOVERY_ENDPOINT), {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (response.status === 404 || response.status === 204) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  return parseHomeAssistantDiscoveryResult(await response.json());
}
