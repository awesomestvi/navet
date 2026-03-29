import { useCallback, useState } from 'react';
import type { TranslateFn } from '@/app/hooks';
import { useServiceActionHandler } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseMediaPlaybackParams {
  entityId: string;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  t: TranslateFn;
}

export function useMediaPlayback({
  entityId,
  isPlaying,
  shuffleEnabled,
  repeatMode,
  t,
}: UseMediaPlaybackParams) {
  const [isOpen, setIsOpen] = useState(false);
  const runAction = useServiceActionHandler();

  const togglePlay = useCallback(() => {
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, isPlaying ? 'pause' : 'play'),
      t('media.feedback.updatePlaybackFailed')
    );
  }, [entityId, isPlaying, runAction, t]);

  const handlePrevious = useCallback(() => {
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, 'previous'),
      t('media.feedback.previousTrackFailed')
    );
  }, [entityId, runAction, t]);

  const handleNext = useCallback(() => {
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, 'next'),
      t('media.feedback.nextTrackFailed')
    );
  }, [entityId, runAction, t]);

  const toggleShuffle = useCallback(() => {
    void runAction(
      () => homeAssistantService.setMediaPlayerShuffle(entityId, !shuffleEnabled),
      t('media.feedback.updateShuffleFailed')
    );
  }, [entityId, runAction, shuffleEnabled, t]);

  const cycleRepeat = useCallback(() => {
    const nextRepeat = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    void runAction(
      () => homeAssistantService.setMediaPlayerRepeat(entityId, nextRepeat),
      t('media.feedback.updateRepeatFailed')
    );
  }, [entityId, repeatMode, runAction, t]);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback((open: boolean) => setIsOpen(open), []);

  return {
    cycleRepeat,
    handleNext,
    handlePrevious,
    isOpen,
    openDialog,
    closeDialog,
    runAction,
    togglePlay,
    toggleShuffle,
  };
}
