import { Music2, Sliders, Users } from 'lucide-react';
import { useState } from 'react';
import { CardDialogTabList, CardDialogTabTrigger } from '@/app/components/patterns';
import { CustomDialogDoneButton, DialogFooter } from '@/app/components/primitives/dialog-shell';
import { ModalSurface } from '@/app/components/primitives/modal-surface';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { MediaCapabilityPanel } from './media-capability-panel';
import type { MediaDialogProps } from './media-dialog.types';
import {
  MediaDialogArtwork,
  MediaDialogGrouping,
  MediaDialogHeader,
  MediaDialogPlaybackControls,
  MediaDialogUpNext,
  MediaDialogVolumeControl,
} from './media-dialog-sections';
import {
  hasSpotifyPlaybackControls,
  MediaSpotifyPlayback,
  selectMediaPlaybackData,
} from './media-spotify-playback';
import { withAlpha } from './use-media-artwork-colors';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogContentProps extends MediaDialogProps {
  controller: MediaDialogController;
}

function hasMediaCapabilityControls({
  capabilities,
  durationSeconds,
  sourceList,
  soundModeList,
}: Pick<
  MediaDialogContentProps,
  'capabilities' | 'durationSeconds' | 'sourceList' | 'soundModeList'
>) {
  return (
    capabilities.canPlayMedia ||
    capabilities.canBrowseMedia ||
    capabilities.canSearchMedia ||
    (capabilities.canSeek && durationSeconds > 0) ||
    (capabilities.canSelectSource && sourceList.length > 0) ||
    (capabilities.canSelectSoundMode && soundModeList.length > 0) ||
    capabilities.canClearPlaylist
  );
}

export function MediaDialogContent({
  artist,
  artwork,
  availableGroupingPlayers,
  capabilities,
  controller,
  durationSeconds,
  elapsedSeconds,
  entityId,
  groupMembers,
  isMuted,
  isOpen,
  isPlaying,
  onArtworkError,
  onAttachGroupMember,
  onClearPlaylist,
  onCycleRepeat,
  onDetachGroupMember,
  onNext,
  onOpenChange,
  onPrevious,
  onSeek,
  canNextTrack,
  canPreviousTrack,
  onSelectSoundMode,
  onSelectSource,
  onToggleMute,
  onTogglePlay,
  onToggleShuffle,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  repeatMode,
  shuffleEnabled,
  soundMode,
  soundModeList,
  source,
  sourceList,
  supportsGrouping,
  title,
  upNextTitle,
  volume,
}: MediaDialogContentProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('playback');
  const { entities, entityRegistry } = useHomeAssistant(selectMediaPlaybackData);
  const hasMediaControls = hasMediaCapabilityControls({
    capabilities,
    durationSeconds,
    sourceList,
    soundModeList,
  });
  const hasSpotifyControls = hasSpotifyPlaybackControls(entities, entityRegistry, entityId);
  const hasGroupingControls = supportsGrouping;
  const shouldRenderTabs = hasMediaControls || hasSpotifyControls || hasGroupingControls;
  const playbackPanel = (
    <div className="space-y-5 md:space-y-6">
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
        canNextTrack={canNextTrack}
        canPreviousTrack={canPreviousTrack}
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
        canMuteVolume={capabilities.canMuteVolume}
        canSetVolume={capabilities.canSetVolume}
        isMuted={isMuted}
        isPlaying={isPlaying}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onVolumeInteractionEnd={onVolumeInteractionEnd}
        onVolumeInteractionStart={onVolumeInteractionStart}
        volume={volume}
      />
      {upNextTitle ? <MediaDialogUpNext controller={controller} title={upNextTitle} /> : null}
    </div>
  );
  const mediaPanel = (
    <div className="space-y-4">
      <MediaSpotifyPlayback controller={controller} entityId={entityId} entityName={title} />
      <MediaCapabilityPanel
        capabilities={capabilities}
        controller={controller}
        durationSeconds={durationSeconds}
        elapsedSeconds={elapsedSeconds}
        entityId={entityId}
        onClearPlaylist={onClearPlaylist}
        onSeek={onSeek}
        onSelectSoundMode={onSelectSoundMode}
        onSelectSource={onSelectSource}
        source={source}
        sourceList={sourceList}
        soundMode={soundMode}
        soundModeList={soundModeList}
      />
    </div>
  );
  const groupingPanel = supportsGrouping ? (
    <MediaDialogGrouping
      availableGroupingPlayers={availableGroupingPlayers}
      controller={controller}
      entityId={entityId}
      groupMembers={groupMembers}
      onAttachGroupMember={onAttachGroupMember}
      onDetachGroupMember={onDetachGroupMember}
    />
  ) : null;

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={artist ?? title}
      bodyClassName="px-5 py-5 md:p-7"
      overlayClassName={`animate-in fade-in ${controller.surface.dialogBackdrop}`}
      contentClassName={`max-h-[85vh] max-w-md overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
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

        {shouldRenderTabs ? (
          <Tabs value={activeTab} defaultValue="playback" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'playback'}
                icon={Sliders}
                onClick={() => setActiveTab('playback')}
              >
                {t('media.tabs.playback')}
              </CardDialogTabTrigger>
              {hasMediaControls || hasSpotifyControls ? (
                <CardDialogTabTrigger
                  active={activeTab === 'media'}
                  icon={Music2}
                  onClick={() => setActiveTab('media')}
                >
                  {t('media.tabs.media')}
                </CardDialogTabTrigger>
              ) : null}
              {hasGroupingControls ? (
                <CardDialogTabTrigger
                  active={activeTab === 'group'}
                  icon={Users}
                  onClick={() => setActiveTab('group')}
                >
                  {t('media.tabs.group')}
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="playback" className="mt-5">
              {playbackPanel}
            </TabPanel>
            {hasMediaControls || hasSpotifyControls ? (
              <TabPanel value="media" className="mt-5">
                {mediaPanel}
              </TabPanel>
            ) : null}
            {hasGroupingControls ? (
              <TabPanel value="group" className="mt-5">
                {groupingPanel}
              </TabPanel>
            ) : null}
          </Tabs>
        ) : (
          playbackPanel
        )}

        <DialogFooter>
          <CustomDialogDoneButton
            label={t('common.done')}
            style={controller.activeMiniControlStyle}
          />
        </DialogFooter>
      </div>
    </ModalSurface>
  );
}
