import { useEffect, useSyncExternalStore } from 'react';
import { getPublicAssetUrl } from '@/app/utils/public-assets';

interface KeepAwakeWakeLockSentinel extends EventTarget {
  release: () => Promise<void>;
}

interface KeepAwakeWakeLockManager {
  request: (type: 'screen') => Promise<KeepAwakeWakeLockSentinel>;
}

type KeepDeviceAwakeMode =
  | 'disabled'
  | 'wake-lock'
  | 'audio-fallback'
  | 'pending-activation'
  | 'blocked'
  | 'unsupported';

export interface KeepDeviceAwakeSnapshot {
  enabled: boolean;
  mode: KeepDeviceAwakeMode;
  canActivateFallback: boolean;
}

const SILENT_AUDIO_URL = getPublicAssetUrl('audio/keep-awake-silence.wav');
const DEFAULT_SNAPSHOT: KeepDeviceAwakeSnapshot = {
  enabled: false,
  mode: 'disabled',
  canActivateFallback: false,
};

const snapshotListeners = new Set<() => void>();

let currentSnapshot = DEFAULT_SNAPSHOT;
let desiredEnabled = false;
let wakeLockSentinel: KeepAwakeWakeLockSentinel | null = null;
let audioElement: HTMLAudioElement | null = null;
let listenersAttached = false;
let requestToken = 0;

function getWakeLockManager(): KeepAwakeWakeLockManager | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const wakeLock = (navigator as Navigator & { wakeLock?: unknown }).wakeLock;
  if (!wakeLock || typeof wakeLock !== 'object') {
    return null;
  }

  return typeof (wakeLock as KeepAwakeWakeLockManager).request === 'function'
    ? (wakeLock as KeepAwakeWakeLockManager)
    : null;
}

function emitSnapshot(nextSnapshot: KeepDeviceAwakeSnapshot) {
  const changed =
    currentSnapshot.enabled !== nextSnapshot.enabled ||
    currentSnapshot.mode !== nextSnapshot.mode ||
    currentSnapshot.canActivateFallback !== nextSnapshot.canActivateFallback;
  currentSnapshot = nextSnapshot;

  if (changed) {
    snapshotListeners.forEach((listener) => {
      listener();
    });
  }
}

function subscribe(listener: () => void) {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
}

function getSnapshot() {
  return currentSnapshot;
}

function canUseAudioFallback() {
  return typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
}

function supportsWakeLock() {
  return getWakeLockManager() !== null;
}

function isAutoplayBlocked(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'AbortError')
  );
}

function getOrCreateAudioElement() {
  if (audioElement) {
    return audioElement;
  }

  const audio = new Audio(SILENT_AUDIO_URL);
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.crossOrigin = 'anonymous';
  audioElement = audio;
  return audio;
}

function stopAudioFallback() {
  if (!audioElement) {
    return;
  }

  audioElement.pause();
  audioElement.currentTime = 0;
}

async function releaseWakeLock() {
  if (!wakeLockSentinel) {
    return;
  }

  const sentinel = wakeLockSentinel;
  wakeLockSentinel = null;
  try {
    await sentinel.release();
  } catch {
    // Best-effort cleanup only.
  }
}

function handleWakeLockRelease() {
  wakeLockSentinel = null;
}

async function startAudioFallback(token: number) {
  if (!desiredEnabled || token !== requestToken || !canUseAudioFallback()) {
    return false;
  }

  const audio = getOrCreateAudioElement();

  try {
    await audio.play();
    if (!desiredEnabled || token !== requestToken) {
      audio.pause();
      audio.currentTime = 0;
      return false;
    }

    emitSnapshot({
      enabled: true,
      mode: 'audio-fallback',
      canActivateFallback: false,
    });
    return true;
  } catch (error) {
    if (!desiredEnabled || token !== requestToken) {
      return false;
    }

    emitSnapshot({
      enabled: true,
      mode: isAutoplayBlocked(error) ? 'pending-activation' : 'blocked',
      canActivateFallback: isAutoplayBlocked(error),
    });
    return false;
  }
}

async function acquireKeepAwake(source: 'auto' | 'manual' = 'auto') {
  if (!desiredEnabled || typeof document === 'undefined') {
    return;
  }

  if (document.visibilityState === 'hidden') {
    await releaseWakeLock();
    stopAudioFallback();
    return;
  }

  const token = ++requestToken;
  const wakeLockSupported = supportsWakeLock();
  const audioSupported = canUseAudioFallback();

  if (wakeLockSupported) {
    try {
      const wakeLock = getWakeLockManager();
      if (!wakeLock) {
        throw new Error('Wake lock became unavailable before request.');
      }

      const sentinel = await wakeLock.request('screen');
      if (!desiredEnabled || token !== requestToken) {
        await sentinel.release().catch(() => undefined);
        return;
      }

      wakeLockSentinel?.removeEventListener('release', handleWakeLockRelease);
      wakeLockSentinel = sentinel;
      wakeLockSentinel.addEventListener('release', handleWakeLockRelease);
      stopAudioFallback();
      emitSnapshot({
        enabled: true,
        mode: 'wake-lock',
        canActivateFallback: false,
      });
      return;
    } catch {
      // Continue to the audio fallback below.
    }
  }

  if (audioSupported) {
    const activated = await startAudioFallback(token);
    if (
      activated ||
      source === 'manual' ||
      currentSnapshot.mode === 'pending-activation' ||
      currentSnapshot.mode === 'blocked'
    ) {
      return;
    }
  }

  emitSnapshot({
    enabled: true,
    mode: wakeLockSupported || audioSupported ? 'blocked' : 'unsupported',
    canActivateFallback: false,
  });
}

function handleVisibilityChange() {
  if (!desiredEnabled || typeof document === 'undefined') {
    return;
  }

  if (document.visibilityState === 'hidden') {
    void releaseWakeLock();
    stopAudioFallback();
    return;
  }

  void acquireKeepAwake();
}

function handleWindowFocus() {
  if (!desiredEnabled || typeof document === 'undefined' || document.visibilityState === 'hidden') {
    return;
  }

  void acquireKeepAwake();
}

function attachRuntimeListeners() {
  if (listenersAttached || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleWindowFocus);
  listenersAttached = true;
}

function detachRuntimeListeners() {
  if (!listenersAttached || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', handleWindowFocus);
  listenersAttached = false;
}

async function disableKeepDeviceAwake() {
  desiredEnabled = false;
  requestToken += 1;
  detachRuntimeListeners();
  await releaseWakeLock();
  stopAudioFallback();
  emitSnapshot(DEFAULT_SNAPSHOT);
}

async function enableKeepDeviceAwake() {
  desiredEnabled = true;
  attachRuntimeListeners();

  if (!supportsWakeLock() && !canUseAudioFallback()) {
    emitSnapshot({
      enabled: true,
      mode: 'unsupported',
      canActivateFallback: false,
    });
    return;
  }

  void acquireKeepAwake();
}

export function useKeepDeviceAwake(enabled: boolean) {
  useEffect(() => {
    if (enabled) {
      void enableKeepDeviceAwake();
    } else {
      void disableKeepDeviceAwake();
    }

    return () => {
      void disableKeepDeviceAwake();
    };
  }, [enabled]);
}

export function useKeepDeviceAwakeSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function activateKeepDeviceAwakeFallback() {
  if (!desiredEnabled) {
    return false;
  }

  await releaseWakeLock();
  requestToken += 1;
  return await startAudioFallback(requestToken);
}

export async function __resetKeepDeviceAwakeForTests() {
  await disableKeepDeviceAwake();
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  currentSnapshot = DEFAULT_SNAPSHOT;
}
