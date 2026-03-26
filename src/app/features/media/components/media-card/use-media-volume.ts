import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseMediaVolumeParams {
  entityId: string;
  initialVolume: number;
  initialMuted: boolean;
  t: ReturnType<typeof useI18n>['t'];
}

export function useMediaVolume({ entityId, initialVolume, initialMuted, t }: UseMediaVolumeParams) {
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

  const runVolumeAction = useCallback(async (action: () => Promise<void>, errorMessage: string) => {
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      const nextPreviousVolume = volume > 0 ? volume : previousVolume;
      setPreviousVolume(nextPreviousVolume);
      setVolume(0);
      void runVolumeAction(
        () => homeAssistantService.setMediaPlayerVolume(entityId, 0),
        t('media.feedback.updateVolumeFailed')
      );
      return;
    }
    const restoredVolume = previousVolume > 0 ? previousVolume : 50;
    setVolume(restoredVolume);
    void runVolumeAction(
      () => homeAssistantService.setMediaPlayerVolume(entityId, restoredVolume),
      t('media.feedback.updateVolumeFailed')
    );
  }, [entityId, isMuted, previousVolume, runVolumeAction, t, volume]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      setVolume(nextVolume);
      if (nextVolume > 0) setPreviousVolume(nextVolume);
      if (nextVolume > 0 && isMuted) setIsMuted(false);
      else if (nextVolume === 0) setIsMuted(true);

      pendingVolumeRef.current = nextVolume;
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
      volumeCommitTimeoutRef.current = window.setTimeout(() => {
        const pendingVolume = pendingVolumeRef.current;
        volumeCommitTimeoutRef.current = null;
        if (pendingVolume === null) return;
        void runVolumeAction(
          () => homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume),
          t('media.feedback.updateVolumeFailed')
        );
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
    void runVolumeAction(
      () => homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume),
      t('media.feedback.updateVolumeFailed')
    );
  }, [entityId, runVolumeAction, t]);

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
