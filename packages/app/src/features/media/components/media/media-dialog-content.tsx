import { CardDialogTabList, CardDialogTabTrigger } from '@navet/app/components/patterns';
import { ModalSurface } from '@navet/app/components/primitives/modal-surface';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { useI18n } from '@navet/app/hooks';
import { Sliders, Tv2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MediaDialogProps } from './media-dialog.types';
import {
  MediaDialogArtwork,
  MediaDialogGrouping,
  MediaDialogHeader,
  MediaDialogPlaybackControls,
  MediaDialogTvControls,
  MediaDialogUpNext,
  MediaDialogVolumeControl,
} from './media-dialog-sections';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogContentProps extends MediaDialogProps {
  controller: MediaDialogController;
}

type TvDialogMode = 'tv' | 'playback';

const MUSIC_SOURCE_KEYWORDS = [
  'spotify',
  'youtube music',
  'apple music',
  'tidal',
  'deezer',
  'amazon music',
  'plexamp',
  'qobuz',
] as const;

const VIDEO_SOURCE_KEYWORDS = [
  'youtube',
  'netflix',
  'disney+',
  'disney plus',
  'prime video',
  'amazon prime',
  'apple tv',
  'hulu',
  'plex',
  'max',
  'hbo',
  'samsung tv plus',
] as const;

function includesKnownKeyword(value: string, keywords: readonly string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function resolveTvDialogMode(params: {
  artist: string;
  entityName: string;
  source?: string;
  title: string;
}): TvDialogMode {
  const normalizedArtist = params.artist.trim().toLowerCase();
  const normalizedEntityName = params.entityName.trim().toLowerCase();
  const normalizedSource = params.source?.trim().toLowerCase() ?? '';
  const normalizedTitle = params.title.trim().toLowerCase();
  const hasArtist = normalizedArtist.length > 0 && normalizedArtist !== normalizedSource;
  const hasDistinctTitle =
    normalizedTitle.length > 0 &&
    normalizedTitle !== normalizedEntityName &&
    normalizedTitle !== normalizedSource;
  const sourceLooksLikeMusic = includesKnownKeyword(normalizedSource, MUSIC_SOURCE_KEYWORDS);
  const sourceLooksLikeVideo = includesKnownKeyword(normalizedSource, VIDEO_SOURCE_KEYWORDS);

  if (sourceLooksLikeMusic && (hasArtist || hasDistinctTitle)) {
    return 'playback';
  }

  if (sourceLooksLikeVideo) {
    return 'tv';
  }

  if (hasArtist && hasDistinctTitle) {
    return 'playback';
  }

  return 'tv';
}

export function MediaDialogContent({
  artist,
  artwork,
  availableGroupingPlayers,
  capabilities,
  controller,
  deviceClass,
  durationSeconds,
  entityName,
  entityType,
  elapsedSeconds,
  entityId,
  room,
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
  onRemoteCommand,
  onSeek,
  canNextTrack,
  canPreviousTrack,
  onSelectSource,
  onToggleMute,
  onTogglePlay,
  onToggleShuffle,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  repeatMode,
  remoteAvailable = false,
  shuffleEnabled,
  source,
  sourceList,
  supportsGrouping,
  title,
  upNextTitle,
  volume,
}: MediaDialogContentProps) {
  const { t } = useI18n();
  const isTvDevice = deviceClass?.trim().toLowerCase() === 'tv';
  const defaultTvDialogMode = useMemo(
    () => resolveTvDialogMode({ artist, entityName, source, title }),
    [artist, entityName, source, title]
  );
  const [activeTab, setActiveTab] = useState<string>(isTvDevice ? defaultTvDialogMode : 'playback');
  const hasGroupingControls = supportsGrouping;
  const shouldRenderTabs = isTvDevice || hasGroupingControls;

  const musicPlaybackPanel = (
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
  const tvControlsPanel = (
    <div className="space-y-5 pt-2 md:space-y-6 md:pt-3">
      <MediaDialogTvControls
        controller={controller}
        source={source}
        sourceList={sourceList}
        isPlaying={isPlaying}
        remoteAvailable={remoteAvailable}
        canSetVolume={capabilities.canSetVolume}
        canMuteVolume={capabilities.canMuteVolume}
        canSelectSource={capabilities.canSelectSource}
        isMuted={isMuted}
        volume={volume}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onVolumeInteractionEnd={onVolumeInteractionEnd}
        onVolumeInteractionStart={onVolumeInteractionStart}
        onSelectSource={onSelectSource}
        onRemoteCommand={onRemoteCommand}
        onTogglePlay={onTogglePlay}
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

  useEffect(() => {
    setActiveTab((current) => {
      if (isTvDevice) {
        return current === 'group' ? current : defaultTvDialogMode;
      }

      return current === 'tv' ? 'playback' : current;
    });
  }, [defaultTvDialogMode, entityId, isTvDevice]);

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={entityName}
      description={entityType}
      bodyClassName="media-dialog-body relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-6 max-sm:px-3.5 max-sm:pt-2 max-sm:pb-3 md:px-7 md:py-6"
      overlayClassName={`animate-in fade-in ${controller.surface.dialogBackdrop}`}
      contentClassName="flex h-auto max-h-[88vh] w-[min(92vw,30rem)] flex-col max-sm:!h-[min(88dvh,calc(100dvh-1rem))] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      contentStyle={controller.dialogSurfaceStyle}
    >
      <div className="relative space-y-6">
        <MediaDialogHeader
          controller={controller}
          entityName={entityName}
          entityType={entityType}
          entityId={entityId}
          room={room}
        />

        {shouldRenderTabs ? (
          <Tabs
            value={activeTab}
            defaultValue={isTvDevice ? defaultTvDialogMode : 'playback'}
            onValueChange={setActiveTab}
          >
            {isTvDevice ? (
              <TabPanel value="tv" className="mt-0">
                {tvControlsPanel}
              </TabPanel>
            ) : null}
            <TabPanel value="playback" className="mt-0">
              {musicPlaybackPanel}
            </TabPanel>
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
                {isTvDevice ? (
                  <CardDialogTabTrigger
                    active={activeTab === 'tv'}
                    className="min-w-[4.75rem] justify-center rounded-full"
                    icon={Tv2}
                    onClick={() => setActiveTab('tv')}
                    style={controller.readableForeground.titleStyle}
                  >
                    {t('media.type.tv')}
                  </CardDialogTabTrigger>
                ) : null}
                <CardDialogTabTrigger
                  active={activeTab === 'playback'}
                  className="min-w-[5.5rem] justify-center rounded-full"
                  icon={Sliders}
                  onClick={() => setActiveTab('playback')}
                  style={controller.readableForeground.titleStyle}
                >
                  {t('media.tabs.playback')}
                </CardDialogTabTrigger>
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
          musicPlaybackPanel
        )}
      </div>
    </ModalSurface>
  );
}
