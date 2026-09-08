import { dispatchEntityCommand } from '@navet/app/commands';
import type { TranslateFn } from '@navet/app/hooks';
import { useServiceActionHandler } from '@navet/app/hooks';
import { useCommandQueue } from '@navet/app/hooks/use-command-queue';
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
  const pendingUnmuteRef = useRef(false);
  const isAdjustingVolumeRef = useRef(false);
  const syncSettleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
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
      return runVolumeAction(async () => {
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

  const { queue: queueVolume, cancel: cancelVolume } = useCommandQueue(
    ({ volume: nextVolume, unmute }: { volume: number; unmute: boolean }) => {
      if (pendingVolumeRef.current === nextVolume) {
        pendingVolumeRef.current = null;
        pendingUnmuteRef.current = false;
      }
      return commitPendingVolume(nextVolume, unmute);
    }
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
      if (shouldUnmute) {
        pendingUnmuteRef.current = true;
        setIsMuted(false);
      }

      pendingVolumeRef.current = nextVolume;
      cancelVolume();
      if (isAdjustingVolumeRef.current) return;
      queueVolume({ volume: nextVolume, unmute: pendingUnmuteRef.current });
    },
    [canMuteVolume, canSetVolume, cancelVolume, isMuted, queueVolume]
  );

  const startVolumeInteraction = useCallback(() => {
    setVolumeAdjusting(true);
  }, [setVolumeAdjusting]);

  const endVolumeInteraction = useCallback(() => {
    if (!canSetVolume) {
      setVolumeAdjusting(false);
      pendingVolumeRef.current = null;
      pendingUnmuteRef.current = false;
      return;
    }
    cancelVolume();
    const pendingVolume = pendingVolumeRef.current;
    pendingVolumeRef.current = null;
    if (pendingVolume === null) {
      pendingUnmuteRef.current = false;
      setVolumeAdjusting(false);
      return;
    }
    const shouldUnmute =
      pendingVolume > 0 && (pendingUnmuteRef.current || (isMuted && canMuteVolume));
    pendingUnmuteRef.current = false;
    if (shouldUnmute) {
      setIsMuted(false);
    }
    queueVolume({ volume: pendingVolume, unmute: shouldUnmute }, true);
  }, [canMuteVolume, canSetVolume, cancelVolume, isMuted, queueVolume, setVolumeAdjusting]);

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
