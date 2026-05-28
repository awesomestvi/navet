import { useCallback, useState } from 'react';
import type { TranslateFn } from '@/app/hooks';
import { useServiceActionHandler } from '@/app/hooks';
import { dispatchEntityAction } from '@/app/services/integration-action.service';

interface UseMediaPlaybackParams {
  entityId: string;
  canPreviousTrack: boolean;
  canNextTrack: boolean;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  t: TranslateFn;
}

export function useMediaPlayback({
  entityId,
  canPreviousTrack,
  canNextTrack,
  shuffleEnabled,
  repeatMode,
  t,
}: UseMediaPlaybackParams) {
  const [isOpen, setIsOpen] = useState(false);
  const runAction = useServiceActionHandler();

  const togglePlay = useCallback(() => {
    void runAction(
      () =>
        dispatchEntityAction({
          entityId,
          domain: 'media_player',
          service: 'media_play_pause',
        }),
      t('media.feedback.updatePlaybackFailed')
    );
  }, [entityId, runAction, t]);

  const handlePrevious = useCallback(() => {
    if (!canPreviousTrack) return;

    void runAction(
      () =>
        dispatchEntityAction({
          entityId,
          domain: 'media_player',
          service: 'media_previous_track',
        }),
      t('media.feedback.previousTrackFailed')
    );
  }, [canPreviousTrack, entityId, runAction, t]);

  const handleNext = useCallback(() => {
    if (!canNextTrack) return;

    void runAction(
      () =>
        dispatchEntityAction({
          entityId,
          domain: 'media_player',
          service: 'media_next_track',
        }),
      t('media.feedback.nextTrackFailed')
    );
  }, [canNextTrack, entityId, runAction, t]);

  const toggleShuffle = useCallback(() => {
    void runAction(
      () =>
        dispatchEntityAction({
          entityId,
          domain: 'media_player',
          service: 'shuffle_set',
          serviceData: { shuffle: !shuffleEnabled },
        }),
      t('media.feedback.updateShuffleFailed')
    );
  }, [entityId, runAction, shuffleEnabled, t]);

  const cycleRepeat = useCallback(() => {
    const nextRepeat = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    void runAction(
      () =>
        dispatchEntityAction({
          entityId,
          domain: 'media_player',
          service: 'repeat_set',
          serviceData: { repeat: nextRepeat },
        }),
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
    canNextTrack,
    canPreviousTrack,
    runAction,
    togglePlay,
    toggleShuffle,
  };
}
