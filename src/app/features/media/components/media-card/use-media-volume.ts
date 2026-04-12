import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranslateFn } from '@/app/hooks';
import { useServiceActionHandler } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseMediaVolumeParams {
  entityId: string;
  initialVolume: number;
  initialMuted: boolean;
  t: TranslateFn;
}

export function useMediaVolume({ entityId, initialVolume, initialMuted, t }: UseMediaVolumeParams) {
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [, setPreviousVolume] = useState(initialVolume > 0 ? initialVolume : 50);
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
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
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
  }, [entityId, isMuted, runVolumeAction, t, volume]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      setVolume(nextVolume);
      if (nextVolume > 0) setPreviousVolume(nextVolume);
      const shouldUnmute = nextVolume > 0 && isMuted;
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
      }, 120);
    },
    [entityId, isMuted, runVolumeAction, t]
  );

  const startVolumeInteraction = useCallback(() => setIsAdjustingVolume(true), []);

  const endVolumeInteraction = useCallback(() => {
    setIsAdjustingVolume(false);
    if (volumeCommitTimeoutRef.current !== null) {
      window.clearTimeout(volumeCommitTimeoutRef.current);
      volumeCommitTimeoutRef.current = null;
    }
    const pendingVolume = pendingVolumeRef.current;
    pendingVolumeRef.current = null;
    if (pendingVolume === null) return;
    const shouldUnmute = pendingVolume > 0 && isMuted;
    if (shouldUnmute) {
      setIsMuted(false);
    }
    void runVolumeAction(async () => {
      if (shouldUnmute) {
        await homeAssistantService.setMediaPlayerMute(entityId, false);
      }
      await homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume);
    }, t('media.feedback.updateVolumeFailed'));
  }, [entityId, isMuted, runVolumeAction, t]);

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
