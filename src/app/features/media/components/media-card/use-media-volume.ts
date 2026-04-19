import { useCallback, useEffect, useRef, useState } from 'react';
import { HA_CONTROL_DEBOUNCE_MS } from '@/app/constants/interaction-timing';
import type { TranslateFn } from '@/app/hooks';
import { useServiceActionHandler } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

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
  const volumeCommitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
    };
  }, []);

  const runVolumeAction = useServiceActionHandler();

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
      void runVolumeAction(
        () => homeAssistantService.setMediaPlayerVolume(entityId, fallbackVolume),
        t('media.feedback.updateVolumeFailed')
      );
      return;
    }

    if (nextMuted) {
      if (volume > 0) {
        setPreviousVolume(volume);
      }
      void runVolumeAction(
        () => homeAssistantService.setMediaPlayerMute(entityId, true),
        t('media.feedback.updateVolumeFailed')
      );
      return;
    }
    void runVolumeAction(
      () => homeAssistantService.setMediaPlayerMute(entityId, false),
      t('media.feedback.updateVolumeFailed')
    );
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
      }
      volumeCommitTimeoutRef.current = window.setTimeout(() => {
        const pendingVolume = pendingVolumeRef.current;
        volumeCommitTimeoutRef.current = null;
        if (pendingVolume === null) return;
        void runVolumeAction(async () => {
          if (shouldUnmute) {
            await homeAssistantService.setMediaPlayerMute(entityId, false);
          }
          await homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume);
        }, t('media.feedback.updateVolumeFailed'));
      }, HA_CONTROL_DEBOUNCE_MS);
    },
    [canMuteVolume, canSetVolume, entityId, isMuted, runVolumeAction, t]
  );

  const startVolumeInteraction = useCallback(() => setIsAdjustingVolume(true), []);

  const endVolumeInteraction = useCallback(() => {
    if (!canSetVolume) {
      setIsAdjustingVolume(false);
      pendingVolumeRef.current = null;
      return;
    }

    setIsAdjustingVolume(false);
    if (volumeCommitTimeoutRef.current !== null) {
      window.clearTimeout(volumeCommitTimeoutRef.current);
      volumeCommitTimeoutRef.current = null;
    }
    const pendingVolume = pendingVolumeRef.current;
    pendingVolumeRef.current = null;
    if (pendingVolume === null) return;
    const shouldUnmute = pendingVolume > 0 && isMuted && canMuteVolume;
    if (shouldUnmute) {
      setIsMuted(false);
    }
    void runVolumeAction(async () => {
      if (shouldUnmute) {
        await homeAssistantService.setMediaPlayerMute(entityId, false);
      }
      await homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume);
    }, t('media.feedback.updateVolumeFailed'));
  }, [canMuteVolume, canSetVolume, entityId, isMuted, runVolumeAction, t]);

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
