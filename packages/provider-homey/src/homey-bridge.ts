import type { IntegrationServiceTarget } from '@navet/core/integration-service-target';
import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import type { HomeySnapshot } from './homey-types';

export interface HomeyBridge {
  ensureConfigured(): void;
  getSnapshot(): HomeySnapshot;
  loadSnapshot(): Promise<HomeySnapshot>;
  replaceSnapshot(snapshot: Partial<HomeySnapshot>): void;
  resetSnapshot(): void;
  subscribe(listener: () => void): () => void;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: IntegrationServiceTarget
  ): Promise<void>;
  entityRuntimeService: ProviderEntityRuntimeService;
}

let bridge: HomeyBridge | null = null;

export function configureHomeyBridge(nextBridge: HomeyBridge) {
  bridge = nextBridge;
}

function getBridge(): HomeyBridge {
  if (!bridge) {
    throw new Error('Homey bridge has not been configured');
  }

  return bridge;
}

export function ensureHomeyConfigured() {
  getBridge().ensureConfigured();
}

export function getHomeySnapshot() {
  return getBridge().getSnapshot();
}

export function loadHomeySnapshot() {
  return getBridge().loadSnapshot();
}

export function replaceHomeySnapshot(snapshot: Partial<HomeySnapshot>) {
  return getBridge().replaceSnapshot(snapshot);
}

export function resetHomeySnapshot() {
  return getBridge().resetSnapshot();
}

export function subscribeHomeySnapshot(listener: () => void) {
  return getBridge().subscribe(listener);
}

export function callHomeyService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
  target?: IntegrationServiceTarget
) {
  return getBridge().callService(domain, service, serviceData, target);
}

export function getHomeyEntityRuntimeService(): ProviderEntityRuntimeService {
  return getBridge().entityRuntimeService;
}
