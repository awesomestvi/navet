import type { OpenHABSnapshotClient } from './openhab-service';
import { openhabService } from './openhab-service';
import type { OpenHABSnapshot } from './openhab-types';

export function getOpenHABSnapshot(): OpenHABSnapshot {
  return openhabService.getSnapshot();
}

export function subscribeOpenHABSnapshot(listener: () => void): () => void {
  return openhabService.subscribe(listener);
}

export function replaceOpenHABSnapshot(snapshot: Partial<OpenHABSnapshot>): void {
  openhabService.replaceSnapshot(snapshot);
}

export function resetOpenHABRuntime(): void {
  openhabService.setClient(null);
  openhabService.resetSnapshot();
}

export function setOpenHABRuntimeClient(client: OpenHABSnapshotClient | null): void {
  openhabService.setClient(client);
}

export function setOpenHABRuntimeError(message: string | null): void {
  openhabService.setError(message);
}
