import { dispatchEntityCommand } from '@navet/app/commands';
import { useCallback, useState } from 'react';
import type { TranslateFn } from '@/app/hooks';
import { useServiceActionHandler } from '@/app/hooks';

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
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'play_pause', entityId });
    }, t('media.feedback.updatePlaybackFailed'));
  }, [entityId, runAction, t]);

  const handlePrevious = useCallback(() => {
    if (!canPreviousTrack) return;

    void runAction(async () => {
      await dispatchEntityCommand({ type: 'previous_track', entityId });
    }, t('media.feedback.previousTrackFailed'));
  }, [canPreviousTrack, entityId, runAction, t]);

  const handleNext = useCallback(() => {
    if (!canNextTrack) return;

    void runAction(async () => {
      await dispatchEntityCommand({ type: 'next_track', entityId });
    }, t('media.feedback.nextTrackFailed'));
  }, [canNextTrack, entityId, runAction, t]);

  const toggleShuffle = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'set_shuffle', entityId, shuffle: !shuffleEnabled });
    }, t('media.feedback.updateShuffleFailed'));
  }, [entityId, runAction, shuffleEnabled, t]);

  const cycleRepeat = useCallback(() => {
    const nextRepeat = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    void runAction(async () => {
      await dispatchEntityCommand({
        type: 'set_repeat_mode',
        entityId,
        repeatMode: nextRepeat,
      });
    }, t('media.feedback.updateRepeatFailed'));
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
