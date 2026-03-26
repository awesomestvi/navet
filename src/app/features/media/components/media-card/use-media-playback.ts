import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseMediaPlaybackParams {
  entityId: string;
  isPlaying: boolean;
  t: ReturnType<typeof useI18n>['t'];
}

export function useMediaPlayback({ entityId, isPlaying, t }: UseMediaPlaybackParams) {
  const [isOpen, setIsOpen] = useState(false);

  const runAction = useCallback(async (action: () => Promise<void>, errorMessage: string) => {
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  }, []);

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

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback((open: boolean) => setIsOpen(open), []);

  return { isOpen, runAction, togglePlay, handlePrevious, handleNext, openDialog, closeDialog };
}
