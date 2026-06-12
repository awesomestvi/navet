import { dispatchEntityCommand } from '@navet/app/commands';
import { HA_CONTROL_DEBOUNCE_MS } from '@navet/app/constants/interaction-timing';
import type { TranslateFn } from '@navet/app/hooks';
import { useServiceActionHandler } from '@navet/app/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_SYNC_SETTLE_MS = 800;

interface UseMediaVolumeParams {
  canMuteVolume: boolean;
  canSetVolume: boolean;
  entityId: string;
  initialVolume: number;
  initialMuted: boolean;
  t: TranslateFn;
}

export function useMediaVolume({
  canMuteVolume,
  canSetVolume,
  entityId,
  initialVolume,
  initialMuted,
  t,
}: UseMediaVolumeParams) {
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [previousVolume, setPreviousVolume] = useState(initialVolume > 0 ? initialVolume : 50);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const pendingVolumeRef = useRef<number | null>(null);
  const isAdjustingVolumeRef = useRef(false);
  const volumeCommitTimeoutRef = useRef<number | null>(null);
  const syncSettleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
      if (syncSettleTimeoutRef.current !== null) {
        window.clearTimeout(syncSettleTimeoutRef.current);
      }
    };
  }, []);

  const runVolumeAction = useServiceActionHandler();

  const setVolumeAdjusting = useCallback((nextAdjusting: boolean) => {
    if (syncSettleTimeoutRef.current !== null) {
      window.clearTimeout(syncSettleTimeoutRef.current);
      syncSettleTimeoutRef.current = null;
    }
    isAdjustingVolumeRef.current = nextAdjusting;
    setIsAdjustingVolume(nextAdjusting);
  }, []);

  const releaseVolumeAdjustingAfterSettle = useCallback(() => {
    if (syncSettleTimeoutRef.current !== null) {
      window.clearTimeout(syncSettleTimeoutRef.current);
    }
    syncSettleTimeoutRef.current = window.setTimeout(() => {
      syncSettleTimeoutRef.current = null;
      isAdjustingVolumeRef.current = false;
      setIsAdjustingVolume(false);
    }, VOLUME_SYNC_SETTLE_MS);
  }, []);

  const commitPendingVolume = useCallback(
    (pendingVolume: number, shouldUnmute: boolean) => {
      setVolumeAdjusting(true);
      void runVolumeAction(async () => {
        try {
          if (shouldUnmute) {
            await dispatchEntityCommand({ type: 'unmute', entityId });
          }
          await dispatchEntityCommand({ type: 'set_volume', entityId, volume: pendingVolume });
        } finally {
          releaseVolumeAdjustingAfterSettle();
        }
      }, t('media.feedback.updateVolumeFailed'));
    },
    [entityId, releaseVolumeAdjustingAfterSettle, runVolumeAction, setVolumeAdjusting, t]
  );

  const toggleMute = useCallback(() => {
    if (!canMuteVolume && !canSetVolume) {
      return;
    }

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (!canMuteVolume && canSetVolume) {
      const fallbackVolume = nextMuted ? 0 : previousVolume;
      if (nextMuted && volume > 0) {
        setPreviousVolume(volume);
      }
      if (!nextMuted && fallbackVolume > 0) {
        setVolume(fallbackVolume);
      }
      void runVolumeAction(async () => {
        await dispatchEntityCommand({ type: 'set_volume', entityId, volume: fallbackVolume });
      }, t('media.feedback.updateVolumeFailed'));
      return;
    }

    if (nextMuted) {
      if (volume > 0) {
        setPreviousVolume(volume);
      }
      void runVolumeAction(async () => {
        await dispatchEntityCommand({ type: 'mute', entityId });
      }, t('media.feedback.updateVolumeFailed'));
      return;
    }
    void runVolumeAction(async () => {
      await dispatchEntityCommand({ type: 'unmute', entityId });
    }, t('media.feedback.updateVolumeFailed'));
  }, [canMuteVolume, canSetVolume, entityId, isMuted, previousVolume, runVolumeAction, t, volume]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      if (!canSetVolume) {
        return;
      }

      setVolume(nextVolume);
      if (nextVolume > 0) setPreviousVolume(nextVolume);
      const shouldUnmute = nextVolume > 0 && isMuted && canMuteVolume;
      if (shouldUnmute) setIsMuted(false);

      pendingVolumeRef.current = nextVolume;
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
        volumeCommitTimeoutRef.current = null;
      }

      if (isAdjustingVolumeRef.current) {
        return;
      }
      volumeCommitTimeoutRef.current = window.setTimeout(() => {
        const pendingVolume = pendingVolumeRef.current;
        volumeCommitTimeoutRef.current = null;
        if (pendingVolume === null) return;
        commitPendingVolume(pendingVolume, shouldUnmute);
      }, HA_CONTROL_DEBOUNCE_MS);
    },
    [canMuteVolume, canSetVolume, commitPendingVolume, isMuted]
  );

  const startVolumeInteraction = useCallback(() => {
    setVolumeAdjusting(true);
  }, [setVolumeAdjusting]);

  const endVolumeInteraction = useCallback(() => {
    if (!canSetVolume) {
      setVolumeAdjusting(false);
      pendingVolumeRef.current = null;
      return;
    }
    if (volumeCommitTimeoutRef.current !== null) {
      window.clearTimeout(volumeCommitTimeoutRef.current);
      volumeCommitTimeoutRef.current = null;
    }
    const pendingVolume = pendingVolumeRef.current;
    pendingVolumeRef.current = null;
    if (pendingVolume === null) {
      setVolumeAdjusting(false);
      return;
    }
    const shouldUnmute = pendingVolume > 0 && isMuted && canMuteVolume;
    if (shouldUnmute) {
      setIsMuted(false);
    }
    commitPendingVolume(pendingVolume, shouldUnmute);
  }, [canMuteVolume, canSetVolume, commitPendingVolume, isMuted, setVolumeAdjusting]);

  return {
    volume,
    isMuted,
    isAdjustingVolume,
    setVolume,
    setIsMuted,
    setPreviousVolume,
    toggleMute,
    handleVolumeChange,
    startVolumeInteraction,
    endVolumeInteraction,
  };
}
