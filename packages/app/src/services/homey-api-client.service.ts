import type { HomeySnapshot } from '../types/homey';
import { subscribeVisibilityAwareAsyncTask } from '../utils/visibility-aware-scheduler';
import type { HomeyCapabilityCommand, HomeySnapshotClient } from './homey.service';
import { homeyService } from './homey.service';

const HOMEY_PROXY_BASE = '/__navet_homey_proxy__';
const HOMEY_SNAPSHOT_POLL_INTERVAL_MS = 15_000;

type HomeySnapshotListener = (snapshot: HomeySnapshot) => void;

const snapshotListeners = new Set<HomeySnapshotListener>();
let snapshotPollCleanup: (() => void) | null = null;
let snapshotRefreshInFlight: Promise<HomeySnapshot> | null = null;
let latestSnapshot: HomeySnapshot = {
  connected: false,
  devices: {},
  zones: {},
};

async function fetchHomeyJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${HOMEY_PROXY_BASE}${path}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Homey request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchHomeySnapshot(): Promise<HomeySnapshot> {
  const [devices, zones] = await Promise.all([
    fetchHomeyJson<HomeySnapshot['devices']>('/api/manager/devices/device'),
    fetchHomeyJson<HomeySnapshot['zones']>('/api/manager/zones/zone'),
  ]);

  latestSnapshot = {
    connected: true,
    devices,
    zones,
  };

  return latestSnapshot;
}

function emitSnapshot(snapshot: HomeySnapshot) {
  for (const listener of snapshotListeners) {
    listener(snapshot);
  }
}

async function refreshHomeySnapshot() {
  if (snapshotRefreshInFlight) {
    return await snapshotRefreshInFlight;
  }

  snapshotRefreshInFlight = fetchHomeySnapshot()
    .then((snapshot) => {
      emitSnapshot(snapshot);
      return snapshot;
    })
    .catch((error) => {
      latestSnapshot = {
        ...latestSnapshot,
        connected: false,
      };
      emitSnapshot(latestSnapshot);
      throw error;
    })
    .finally(() => {
      snapshotRefreshInFlight = null;
    });

  return await snapshotRefreshInFlight;
}

function handleSnapshotRefreshEvent() {
  if (snapshotListeners.size === 0) {
    return;
  }

  void refreshHomeySnapshot().catch(() => undefined);
}

function stopSnapshotPolling() {
  snapshotPollCleanup?.();
  snapshotPollCleanup = null;

  window.removeEventListener('focus', handleSnapshotRefreshEvent);
  window.removeEventListener('online', handleSnapshotRefreshEvent);
}

function startSnapshotPolling() {
  if (snapshotPollCleanup !== null || typeof window === 'undefined') {
    return;
  }

  snapshotPollCleanup = subscribeVisibilityAwareAsyncTask(async () => {
    await refreshHomeySnapshot().catch(() => undefined);
  }, HOMEY_SNAPSHOT_POLL_INTERVAL_MS);

  window.addEventListener('focus', handleSnapshotRefreshEvent);
  window.addEventListener('online', handleSnapshotRefreshEvent);
}

export const homeyApiClient: HomeySnapshotClient = {
  async loadSnapshot(): Promise<HomeySnapshot> {
    return await fetchHomeySnapshot();
  },
  async setCapabilityValue(command: HomeyCapabilityCommand): Promise<void> {
    const response = await fetch(
      `${HOMEY_PROXY_BASE}/api/manager/devices/device/${encodeURIComponent(
        command.deviceId
      )}/capability/${encodeURIComponent(command.capabilityId)}`,
      {
        method: 'PUT',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: command.value,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Homey capability update failed with status ${response.status}`);
    }
  },
  subscribeSnapshot(listener) {
    snapshotListeners.add(listener);
    startSnapshotPolling();

    return () => {
      snapshotListeners.delete(listener);
      if (snapshotListeners.size === 0) {
        stopSnapshotPolling();
      }
    };
  },
};

export function ensureHomeyApiClientConfigured() {
  if (!homeyService.isConfigured()) {
    homeyService.setClient(homeyApiClient);
  }
}
