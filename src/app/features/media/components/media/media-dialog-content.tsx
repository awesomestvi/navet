import {
  CustomDialogDoneButton,
  DialogFooter,
  DialogShell,
} from '@/app/components/shared/dialog-shell';
import { useI18n } from '@/app/hooks';
import type { MediaDialogProps } from './media-dialog.types';
import {
  MediaDialogArtwork,
  MediaDialogGrouping,
  MediaDialogHeader,
  MediaDialogPlaybackControls,
  MediaDialogUpNext,
  MediaDialogVolumeControl,
} from './media-dialog-sections';
import { withAlpha } from './use-media-artwork-colors';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogContentProps extends MediaDialogProps {
  controller: MediaDialogController;
}

export function MediaDialogContent({
  artist,
  artwork,
  availableGroupingPlayers,
  controller,
  entityId,
  groupMembers,
  isMuted,
  isOpen,
  isPlaying,
  onArtworkError,
  onAttachGroupMember,
  onCycleRepeat,
  onDetachGroupMember,
  onNext,
  onOpenChange,
  onPrevious,
  onToggleMute,
  onTogglePlay,
  onToggleShuffle,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  repeatMode,
  shuffleEnabled,
  supportsGrouping,
  title,
  upNextTitle,
  volume,
}: MediaDialogContentProps) {
  const { t } = useI18n();

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={`animate-in fade-in ${controller.surface.dialogBackdrop}`}
      contentClassName={`fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border px-5 py-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 md:w-[90vw] md:p-7 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        controller.isGlass ? 'bg-white/8 border-white/18' : 'bg-zinc-950/92 border-white/10'
      }`}
      contentStyle={controller.dialogSurfaceStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{
          background: `linear-gradient(180deg, ${withAlpha(controller.palette.highlight, controller.theme === 'light' ? 0.06 : 0.05)} 0%, transparent 18%, ${withAlpha(
            controller.palette.darkMuted,
            controller.theme === 'light' ? 0.08 : 0.14
          )} 100%)`,
        }}
      />

      <div className="relative space-y-5 md:space-y-6">
        <MediaDialogHeader
          artist={artist}
          controller={controller}
          entityId={entityId}
          title={title}
        />
        <MediaDialogArtwork
          artist={artist}
          artwork={artwork}
          controller={controller}
          onArtworkError={onArtworkError}
          title={title}
        />
        <MediaDialogPlaybackControls
          controller={controller}
          isPlaying={isPlaying}
          onCycleRepeat={onCycleRepeat}
          onNext={onNext}
          onPrevious={onPrevious}
          onTogglePlay={onTogglePlay}
          onToggleShuffle={onToggleShuffle}
          repeatMode={repeatMode}
          shuffleEnabled={shuffleEnabled}
        />
        <MediaDialogVolumeControl
          controller={controller}
          isMuted={isMuted}
          isPlaying={isPlaying}
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
          onVolumeInteractionEnd={onVolumeInteractionEnd}
          onVolumeInteractionStart={onVolumeInteractionStart}
          volume={volume}
        />
        {upNextTitle ? <MediaDialogUpNext controller={controller} title={upNextTitle} /> : null}
        {supportsGrouping ? (
          <MediaDialogGrouping
            availableGroupingPlayers={availableGroupingPlayers}
            controller={controller}
            entityId={entityId}
            groupMembers={groupMembers}
            onAttachGroupMember={onAttachGroupMember}
            onDetachGroupMember={onDetachGroupMember}
          />
        ) : null}

        <DialogFooter>
          <CustomDialogDoneButton
            label={t('common.done')}
            style={controller.activeMiniControlStyle}
          />
        </DialogFooter>
      </div>
    </DialogShell>
  );
}
