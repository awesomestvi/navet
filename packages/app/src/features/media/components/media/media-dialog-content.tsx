import { CardDialogTabList, CardDialogTabTrigger } from '@navet/app/components/patterns';
import { ModalSurface } from '@navet/app/components/primitives/modal-surface';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { useProviderMediaPlaybackData } from '@navet/app/features/media/hooks/use-provider-media-playback-data';
import { useEntityProviderFeatureMatrix, useI18n } from '@navet/app/hooks';
import { Music2, Sliders, Users } from 'lucide-react';
import { useState } from 'react';
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
import { hasSpotifyPlaybackControls, MediaSpotifyPlayback } from './media-spotify-playback';
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
  entityName,
  entityType,
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
  const { entities, entityRegistry } = useProviderMediaPlaybackData(entityId);
  const featureMatrix = useEntityProviderFeatureMatrix(entityId);
  const hasMediaControls = hasMediaCapabilityControls({
    capabilities,
    durationSeconds,
    sourceList,
    soundModeList,
  });
  const hasSpotifyControls =
    featureMatrix.mediaControls &&
    hasSpotifyPlaybackControls(entities, entityRegistry, capabilities.canPlayMedia);
  const hasGroupingControls = supportsGrouping;
  const shouldRenderMediaTab =
    (hasMediaControls && (featureMatrix.mediaControls || featureMatrix.mediaBrowse)) ||
    hasSpotifyControls;
  const shouldRenderTabs = shouldRenderMediaTab || hasGroupingControls;
  const playbackPanel = (
    <div className="space-y-6 pt-2 md:space-y-7 md:pt-3">
      <MediaDialogArtwork
        artist={artist}
        artwork={artwork}
        controller={controller}
        onArtworkError={onArtworkError}
        title={title}
      />
      <MediaDialogPlaybackControls
        artist={artist}
        title={title}
        controller={controller}
        isPlaying={isPlaying}
        canNextTrack={canNextTrack}
        canPreviousTrack={canPreviousTrack}
        durationSeconds={durationSeconds}
        elapsedSeconds={elapsedSeconds}
        onCycleRepeat={onCycleRepeat}
        onNext={onNext}
        onPrevious={onPrevious}
        onSeek={onSeek}
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
      title={entityName}
      description={entityType}
      bodyClassName="px-5 py-5 md:px-7 md:py-6"
      overlayClassName={`animate-in fade-in ${controller.surface.dialogBackdrop}`}
      contentClassName={`max-h-[88vh] w-[min(92vw,30rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
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

      <div className="relative space-y-6">
        <MediaDialogHeader
          controller={controller}
          entityName={entityName}
          entityType={entityType}
          entityId={entityId}
        />

        {shouldRenderTabs ? (
          <Tabs value={activeTab} defaultValue="playback" onValueChange={setActiveTab}>
            <TabPanel value="playback" className="mt-0">
              {playbackPanel}
            </TabPanel>
            {shouldRenderMediaTab ? (
              <TabPanel value="media" className="mt-0">
                {mediaPanel}
              </TabPanel>
            ) : null}
            {hasGroupingControls ? (
              <TabPanel value="group" className="mt-0">
                {groupingPanel}
              </TabPanel>
            ) : null}

            <div className="flex justify-center pt-1">
              <CardDialogTabList
                className={`rounded-full border p-1 ${controller.surface.border} ${
                  controller.isGlass ? 'bg-white/10' : 'bg-white/[0.06]'
                }`}
              >
                <CardDialogTabTrigger
                  active={activeTab === 'playback'}
                  className="min-w-[5.5rem] justify-center rounded-full"
                  icon={Sliders}
                  onClick={() => setActiveTab('playback')}
                  style={controller.readableForeground.titleStyle}
                >
                  {t('media.tabs.playback')}
                </CardDialogTabTrigger>
                {shouldRenderMediaTab ? (
                  <CardDialogTabTrigger
                    active={activeTab === 'media'}
                    className="min-w-[5rem] justify-center rounded-full"
                    icon={Music2}
                    onClick={() => setActiveTab('media')}
                    style={controller.readableForeground.titleStyle}
                  >
                    {t('media.tabs.media')}
                  </CardDialogTabTrigger>
                ) : null}
                {hasGroupingControls ? (
                  <CardDialogTabTrigger
                    active={activeTab === 'group'}
                    className="min-w-[5rem] justify-center rounded-full"
                    icon={Users}
                    onClick={() => setActiveTab('group')}
                    style={controller.readableForeground.titleStyle}
                  >
                    {t('media.tabs.group')}
                  </CardDialogTabTrigger>
                ) : null}
              </CardDialogTabList>
            </div>
          </Tabs>
        ) : (
          playbackPanel
        )}
      </div>
    </ModalSurface>
  );
}
