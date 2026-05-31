import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { useEffect, useSyncExternalStore } from 'react';

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
const RECOVERY_RETRY_DELAY_MS = 5_000;
const HEALTH_CHECK_INTERVAL_MS = 60_000;
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
let gestureRecoveryAttached = false;
let requestToken = 0;
let recoveryTimeoutId: ReturnType<typeof setTimeout> | null = null;
let healthCheckIntervalId: ReturnType<typeof setInterval> | null = null;
let stoppingAudioFallback = false;

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
  if (typeof audio.setAttribute === 'function') {
    audio.setAttribute('playsinline', '');
  }
  audio.crossOrigin = 'anonymous';
  audio.addEventListener('pause', handleAudioLifecycleEvent);
  audio.addEventListener('ended', handleAudioLifecycleEvent);
  audioElement = audio;
  return audio;
}

function stopAudioFallback() {
  if (!audioElement) {
    return;
  }

  stoppingAudioFallback = true;
  audioElement.pause();
  audioElement.currentTime = 0;
  stoppingAudioFallback = false;
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
  scheduleRecovery(0);
}

function clearRecoveryTimer() {
  if (recoveryTimeoutId !== null) {
    clearTimeout(recoveryTimeoutId);
    recoveryTimeoutId = null;
  }
}

function detachGestureRecoveryListeners() {
  if (!gestureRecoveryAttached || typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('pointerdown', handleGestureRecovery);
  window.removeEventListener('touchstart', handleGestureRecovery);
  window.removeEventListener('keydown', handleGestureRecovery);
  gestureRecoveryAttached = false;
}

function attachGestureRecoveryListeners() {
  if (gestureRecoveryAttached || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('pointerdown', handleGestureRecovery, { passive: true });
  window.addEventListener('touchstart', handleGestureRecovery, { passive: true });
  window.addEventListener('keydown', handleGestureRecovery);
  gestureRecoveryAttached = true;
}

function emitPendingActivationSnapshot() {
  attachGestureRecoveryListeners();
  emitSnapshot({
    enabled: true,
    mode: 'pending-activation',
    canActivateFallback: true,
  });
}

function scheduleRecovery(delay = RECOVERY_RETRY_DELAY_MS) {
  if (!desiredEnabled) {
    return;
  }

  clearRecoveryTimer();
  recoveryTimeoutId = setTimeout(() => {
    recoveryTimeoutId = null;
    if (
      !desiredEnabled ||
      typeof document === 'undefined' ||
      document.visibilityState === 'hidden'
    ) {
      return;
    }

    void acquireKeepAwake();
  }, delay);
}

function handleAudioLifecycleEvent() {
  if (
    stoppingAudioFallback ||
    !desiredEnabled ||
    typeof document === 'undefined' ||
    document.visibilityState === 'hidden'
  ) {
    return;
  }

  scheduleRecovery(0);
}

function handleGestureRecovery() {
  if (!desiredEnabled || typeof document === 'undefined' || document.visibilityState === 'hidden') {
    return;
  }

  detachGestureRecoveryListeners();
  void acquireKeepAwake('gesture');
}

function startHealthChecks() {
  if (healthCheckIntervalId !== null || typeof window === 'undefined') {
    return;
  }

  healthCheckIntervalId = setInterval(() => {
    if (
      !desiredEnabled ||
      typeof document === 'undefined' ||
      document.visibilityState === 'hidden'
    ) {
      return;
    }

    if (currentSnapshot.mode === 'wake-lock' && !wakeLockSentinel) {
      scheduleRecovery(0);
      return;
    }

    if (currentSnapshot.mode === 'audio-fallback' && audioElement?.paused) {
      scheduleRecovery(0);
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

function stopHealthChecks() {
  if (healthCheckIntervalId !== null) {
    clearInterval(healthCheckIntervalId);
    healthCheckIntervalId = null;
  }
}

async function startAudioFallback(token: number, source: 'auto' | 'manual' | 'gesture' = 'auto') {
  if (!desiredEnabled || token !== requestToken || !canUseAudioFallback()) {
    return false;
  }

  const audio = getOrCreateAudioElement();

  try {
    await audio.play();
    if (!desiredEnabled || token !== requestToken) {
      stopAudioFallback();
      return false;
    }

    detachGestureRecoveryListeners();
    clearRecoveryTimer();
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

    if (isAutoplayBlocked(error) && source !== 'manual') {
      emitPendingActivationSnapshot();
    } else {
      detachGestureRecoveryListeners();
      emitSnapshot({
        enabled: true,
        mode: isAutoplayBlocked(error) ? 'pending-activation' : 'blocked',
        canActivateFallback: isAutoplayBlocked(error),
      });
      if (!isAutoplayBlocked(error)) {
        scheduleRecovery();
      }
    }
    return false;
  }
}

async function acquireKeepAwake(source: 'auto' | 'manual' | 'gesture' = 'auto') {
  if (!desiredEnabled || typeof document === 'undefined') {
    return;
  }

  if (document.visibilityState === 'hidden') {
    await releaseWakeLock();
    stopAudioFallback();
    return;
  }

  clearRecoveryTimer();
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
      detachGestureRecoveryListeners();
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
    const activated = await startAudioFallback(token, source);
    if (activated || currentSnapshot.mode === 'pending-activation') {
      return;
    }
  }

  detachGestureRecoveryListeners();
  emitSnapshot({
    enabled: true,
    mode: wakeLockSupported || audioSupported ? 'blocked' : 'unsupported',
    canActivateFallback: false,
  });
  if (wakeLockSupported || audioSupported) {
    scheduleRecovery();
  }
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
  startHealthChecks();
}

function detachRuntimeListeners() {
  if (!listenersAttached || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', handleWindowFocus);
  listenersAttached = false;
  stopHealthChecks();
}

async function disableKeepDeviceAwake() {
  desiredEnabled = false;
  requestToken += 1;
  clearRecoveryTimer();
  detachGestureRecoveryListeners();
  detachRuntimeListeners();
  await releaseWakeLock();
  stopAudioFallback();
  emitSnapshot(DEFAULT_SNAPSHOT);
}

async function enableKeepDeviceAwake() {
  desiredEnabled = true;
  attachRuntimeListeners();

  if (!supportsWakeLock() && !canUseAudioFallback()) {
    detachGestureRecoveryListeners();
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

  detachGestureRecoveryListeners();
  clearRecoveryTimer();
  await releaseWakeLock();
  requestToken += 1;
  return await startAudioFallback(requestToken, 'manual');
}

export async function __resetKeepDeviceAwakeForTests() {
  await disableKeepDeviceAwake();
  if (audioElement) {
    audioElement.removeEventListener('pause', handleAudioLifecycleEvent);
    audioElement.removeEventListener('ended', handleAudioLifecycleEvent);
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  currentSnapshot = DEFAULT_SNAPSHOT;
}
