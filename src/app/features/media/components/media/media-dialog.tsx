import * as Dialog from '@radix-ui/react-dialog';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { formatMediaTime } from './media-time';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

interface MediaDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  artwork?: string | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  title: string;
  artist: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  supportsGrouping: boolean;
  groupMembers: string[];
  availableGroupingPlayers: Array<{
    id: string;
    name: string;
    isAttached: boolean;
  }>;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  upNextTitle?: string;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onAttachGroupMember: (entityId: string) => void;
  onDetachGroupMember: (entityId: string) => void;
}

export function MediaDialog({
  entityId,
  isOpen,
  onOpenChange,
  artwork,
  onArtworkError,
  title,
  artist,
  isPlaying,
  volume,
  isMuted,
  elapsedSeconds,
  durationSeconds,
  supportsGrouping,
  groupMembers,
  availableGroupingPlayers,
  onPrevious,
  onTogglePlay,
  onNext,
  shuffleEnabled,
  repeatMode,
  onToggleShuffle,
  onCycleRepeat,
  upNextTitle,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
  onAttachGroupMember,
  onDetachGroupMember,
}: MediaDialogProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const displayDuration = durationSeconds > 0 ? formatMediaTime(durationSeconds) : '--:--';
  const dialogSurfaceStyle = {
    background:
      theme === 'light'
        ? `linear-gradient(165deg, ${withAlpha(palette.highlight, 0.95)} 0%, ${withAlpha(
            palette.dominant,
            0.92
          )} 42%, ${withAlpha(palette.gradientEnd, 0.9)} 100%)`
        : `radial-gradient(circle at top left, ${withAlpha(palette.highlight, 0.18)} 0%, transparent 28%), radial-gradient(circle at 78% 22%, ${withAlpha(
            palette.vibrant,
            0.18
          )} 0%, transparent 26%), linear-gradient(165deg, ${withAlpha(
            palette.dominant,
            0.94
          )} 0%, ${withAlpha(palette.darkMuted, 0.95)} 58%, ${withAlpha(
            palette.gradientEnd,
            0.98
          )} 100%)`,
    borderColor:
      theme === 'light' ? withAlpha(palette.vibrant, 0.18) : withAlpha(palette.highlight, 0.16),
    boxShadow:
      theme === 'light'
        ? `0 28px 60px -34px ${withAlpha(palette.darkMuted, 0.34)}`
        : `0 30px 72px -36px ${withAlpha(palette.gradientEnd, 0.72)}`,
  } as const;
  const subtleControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(
      shuffleEnabled || repeatMode !== 'off' ? palette.highlight : palette.highlight,
      theme === 'light' ? 0.22 : 0.14
    )} 0%, ${withAlpha(palette.darkMuted, theme === 'light' ? 0.2 : 0.18)} 100%)`,
    borderColor: withAlpha(palette.highlight, theme === 'light' ? 0.12 : 0.18),
    boxShadow: `0 14px 30px -22px ${withAlpha(palette.darkMuted, theme === 'light' ? 0.22 : 0.46)}`,
  } as const;
  const activeTransportStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.42)} 0%, ${withAlpha(
      palette.vibrant,
      0.82
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.24),
    boxShadow: `0 18px 42px -18px ${withAlpha(palette.vibrant, 0.54)}`,
  } as const;
  const accentControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.3)} 0%, ${withAlpha(
      palette.vibrant,
      0.72
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.24),
    boxShadow: `0 16px 36px -20px ${withAlpha(palette.vibrant, 0.46)}`,
  } as const;
  const activeMiniControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.52
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.22),
    boxShadow: `0 12px 28px -18px ${withAlpha(palette.vibrant, 0.42)}`,
  } as const;

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border px-5 py-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 md:w-[90vw] md:p-7 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        isGlass ? 'bg-white/8 border-white/18' : 'bg-zinc-950/92 border-white/10'
      }`}
      contentStyle={dialogSurfaceStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{
          background: `linear-gradient(180deg, ${withAlpha(palette.highlight, theme === 'light' ? 0.06 : 0.05)} 0%, transparent 18%, ${withAlpha(
            palette.darkMuted,
            theme === 'light' ? 0.08 : 0.14
          )} 100%)`,
        }}
      />

      <div className="relative space-y-5 md:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Dialog.Title className={`truncate text-xl font-semibold ${surface.textPrimary}`}>
              {title}
            </Dialog.Title>
            <Dialog.Description className={`mt-1 truncate text-sm ${surface.textSecondary}`}>
              {artist}
            </Dialog.Description>
            <div className="mt-2">
              <EntityRoomSelector
                entityId={entityId}
                label={t('media.room')}
                compact
                className={surface.textSecondary}
              />
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className={`shrink-0 rounded-xl p-2 transition-all duration-300 ${isGlass ? 'bg-white/10 hover:bg-white/14' : 'bg-white/8 hover:bg-white/12'} ${surface.textPrimary}`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path
                  d="M6 6 14 14M14 6 6 14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </Dialog.Close>
        </div>

        {/* Album Art */}
        <div className="flex justify-center">
          {artwork ? (
            <img
              src={artwork}
              alt={t('media.artworkAlt', { title, artist })}
              onError={() => onArtworkError?.(artwork)}
              className="h-44 w-44 rounded-3xl object-cover shadow-2xl md:h-48 md:w-48"
            />
          ) : (
            <MediaFallbackArtwork
              palette={palette}
              className="relative h-44 w-44 rounded-3xl shadow-2xl md:h-48 md:w-48"
            />
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <RoundControlButton
            theme={theme}
            size="medium"
            variant="soft"
            aria-label={t('media.shuffle')}
            onClick={onToggleShuffle}
            className={`h-10 w-10 transition-colors ${shuffleEnabled ? '!border-0 text-white' : ''}`}
            style={shuffleEnabled ? activeMiniControlStyle : subtleControlStyle}
          >
            <Shuffle className="h-4 w-4" />
          </RoundControlButton>
          <RoundControlButton
            theme={theme}
            size="large"
            variant="soft"
            aria-label={t('media.previousTrack')}
            onClick={onPrevious}
            className="h-12 w-12 transition-colors !border-0 text-white"
            style={subtleControlStyle}
          >
            <SkipBack className="h-6 w-6" />
          </RoundControlButton>
          <RoundControlButton
            theme={theme}
            size="large"
            variant="emphasis"
            onClick={onTogglePlay}
            aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
            className="h-16 w-16 transition-colors !border-0 text-white"
            style={activeTransportStyle}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7" fill="currentColor" />
            ) : (
              <Play className="h-7 w-7" fill="currentColor" />
            )}
          </RoundControlButton>
          <RoundControlButton
            theme={theme}
            size="large"
            variant="soft"
            aria-label={t('media.nextTrack')}
            onClick={onNext}
            className="h-12 w-12 transition-colors !border-0 text-white"
            style={subtleControlStyle}
          >
            <SkipForward className="h-6 w-6" />
          </RoundControlButton>
          <RoundControlButton
            theme={theme}
            size="medium"
            variant="soft"
            aria-label={
              repeatMode === 'one'
                ? t('media.repeatOne')
                : repeatMode === 'all'
                  ? t('media.repeatAll')
                  : t('media.repeatOff')
            }
            onClick={onCycleRepeat}
            className={`h-10 w-10 transition-colors ${repeatMode !== 'off' ? '!border-0 text-white' : ''}`}
            style={repeatMode !== 'off' ? activeMiniControlStyle : subtleControlStyle}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </RoundControlButton>
        </div>

        {/* Volume Control */}
        <div>
          {isPlaying && (
            <div className="mb-3 flex items-center justify-between">
              <span className={`text-sm ${surface.textSecondary}`}>{displayRemaining}</span>
              <span className={`text-sm ${surface.textSecondary}`}>{displayDuration}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${surface.textSecondary}`}>
              {t('media.volume')}
            </span>
            <span className={`text-sm font-semibold ${surface.textPrimary}`}>
              {isMuted ? 0 : volume}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onToggleMute}
              aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
              className="h-10 w-10 transition-colors !border-0 text-white"
              style={isMuted ? subtleControlStyle : accentControlStyle}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </RoundControlButton>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="absolute left-0 top-0 h-full bg-white transition-all duration-150"
                style={{ width: isMuted ? '0%' : `${volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onMouseDown={onVolumeInteractionStart}
                onTouchStart={onVolumeInteractionStart}
                onKeyDown={onVolumeInteractionStart}
                onMouseUp={onVolumeInteractionEnd}
                onTouchEnd={onVolumeInteractionEnd}
                onKeyUp={onVolumeInteractionEnd}
                onBlur={onVolumeInteractionEnd}
                onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {upNextTitle ? (
          <div>
            <span className={`mb-2 block text-sm font-medium ${surface.textSecondary}`}>
              {t('media.upNext')}
            </span>
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${surface.textPrimary} ${isGlass ? 'bg-white/10' : 'bg-white/5'} ${surface.border}`}
            >
              {upNextTitle}
            </div>
          </div>
        ) : null}

        {supportsGrouping ? (
          <div>
            <span className={`mb-3 block text-sm font-medium ${surface.textSecondary}`}>
              {t('media.group.title')}
            </span>

            <div className="space-y-3">
              <div>
                <div className={`mb-2 text-xs uppercase tracking-[0.14em] ${surface.textMuted}`}>
                  {t('media.group.attached')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupMembers.filter((memberId) => memberId !== entityId).length > 0 ? (
                    availableGroupingPlayers
                      .filter((player) => player.isAttached)
                      .map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          onClick={() => onDetachGroupMember(player.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${surface.border} ${surface.textPrimary} ${isGlass ? 'bg-white/10 hover:bg-white/14' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                          {player.name} · {t('media.group.detach')}
                        </button>
                      ))
                  ) : (
                    <div className={`text-sm ${surface.textMuted}`}>
                      {t('media.group.noAttached')}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className={`mb-2 text-xs uppercase tracking-[0.14em] ${surface.textMuted}`}>
                  {t('media.group.available')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableGroupingPlayers.filter((player) => !player.isAttached).length > 0 ? (
                    availableGroupingPlayers
                      .filter((player) => !player.isAttached)
                      .map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          onClick={() => onAttachGroupMember(player.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${surface.border} ${surface.textPrimary} ${isGlass ? 'bg-white/10 hover:bg-white/14' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                          {player.name} · {t('media.group.attach')}
                        </button>
                      ))
                  ) : (
                    <div className={`text-sm ${surface.textMuted}`}>
                      {t('media.group.noAvailable')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
