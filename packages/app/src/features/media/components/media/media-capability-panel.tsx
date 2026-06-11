import { Button, Checkbox, Input, Select } from '@navet/app/components/primitives';
import type { MediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { useEntityProviderFeature, useI18n, useServiceActionHandler } from '@navet/app/hooks';
import type { PlatformMediaBrowseResult } from '@navet/app/platform/provider-feature-models';
import { integrationMediaFeatureService } from '@navet/app/services/integration-media-feature.service';
import { ListMusic, Search, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { withAlpha } from './use-media-artwork-colors';
import type { MediaDialogController } from './use-media-dialog-controller';

type EnqueueMode = 'play' | 'next' | 'add' | 'replace';

interface MediaCapabilityPanelProps {
  capabilities: MediaPlayerCapabilities;
  controller: MediaDialogController;
  durationSeconds: number;
  elapsedSeconds: number;
  entityId: string;
  onClearPlaylist: () => void;
  onSeek: (elapsedSeconds: number) => void;
  onSelectSoundMode: (soundMode: string) => void;
  onSelectSource: (source: string) => void;
  source?: string;
  sourceList: string[];
  soundMode?: string;
  soundModeList: string[];
}

function inferMediaContentType(mediaContentId: string, fallback?: string) {
  const value = mediaContentId.trim().toLowerCase();
  if (fallback) return fallback;
  if (value.includes(':playlist:') || value.includes('/playlist/')) return 'playlist';
  if (value.includes(':episode:') || value.includes('/episode/')) return 'episode';
  if (value.includes(':movie:') || value.includes('/movie/')) return 'movie';
  if (value.startsWith('http://') || value.startsWith('https://')) return 'music';
  return 'music';
}

function flattenPlayableItems(result?: PlatformMediaBrowseResult | null) {
  return (result?.children ?? []).filter(
    (item) => item.mediaContentId && item.mediaContentType && (item.canPlay || item.canExpand)
  );
}

export function MediaCapabilityPanel({
  capabilities,
  controller,
  durationSeconds,
  elapsedSeconds,
  entityId,
  onClearPlaylist,
  onSeek,
  onSelectSoundMode,
  onSelectSource,
  source,
  sourceList,
  soundMode,
  soundModeList,
}: MediaCapabilityPanelProps) {
  const { t } = useI18n();
  const runAction = useServiceActionHandler();
  const announceCheckboxId = useId();
  const [mediaContentId, setMediaContentId] = useState('');
  const [mediaContentType, setMediaContentType] = useState('music');
  const [enqueue, setEnqueue] = useState<EnqueueMode>('play');
  const [announce, setAnnounce] = useState(false);
  const [browseResult, setBrowseResult] = useState<PlatformMediaBrowseResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<PlatformMediaBrowseResult | null>(null);
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const supportsMediaControls = useEntityProviderFeature(entityId, 'mediaControls');
  const supportsMediaBrowse = useEntityProviderFeature(entityId, 'mediaBrowse');

  const canShowPanel =
    ((capabilities.canPlayMedia ||
      capabilities.canSeek ||
      (capabilities.canSelectSource && sourceList.length > 0) ||
      (capabilities.canSelectSoundMode && soundModeList.length > 0) ||
      capabilities.canClearPlaylist) &&
      supportsMediaControls) ||
    ((capabilities.canBrowseMedia || capabilities.canSearchMedia) && supportsMediaBrowse);

  if (!canShowPanel) {
    return null;
  }

  const playMedia = (contentId: string, contentType?: string) => {
    const trimmedContentId = contentId.trim();
    if (!trimmedContentId || !capabilities.canPlayMedia || !supportsMediaControls) return;

    void runAction(
      () =>
        integrationMediaFeatureService.playMedia(entityId, {
          mediaContentId: trimmedContentId,
          mediaContentType: inferMediaContentType(trimmedContentId, contentType),
          enqueue: capabilities.canEnqueue ? enqueue : undefined,
          announce: capabilities.canAnnounce ? announce : undefined,
        }),
      t('media.feedback.playMediaFailed')
    );
  };

  const browseMedia = (item?: PlatformMediaBrowseResult) => {
    if (!supportsMediaBrowse) {
      return;
    }

    void runAction(async () => {
      const result = await integrationMediaFeatureService.browseMediaPlayer(entityId, {
        mediaContentId: item?.mediaContentId,
        mediaContentType: item?.mediaContentType,
      });
      setBrowseResult(result);
    }, t('media.feedback.browseMediaFailed'));
  };

  const searchMedia = () => {
    const query = searchQuery.trim();
    if (!query || !supportsMediaBrowse) return;

    void runAction(async () => {
      const result = await integrationMediaFeatureService.searchMediaPlayer(entityId, query);
      setSearchResult(result);
    }, t('media.feedback.searchMediaFailed'));
  };

  const itemButtonClassName = `w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${controller.surface.border} ${controller.surface.textPrimary} ${
    controller.isGlass ? 'bg-white/8 hover:bg-white/12' : 'bg-white/5 hover:bg-white/10'
  }`;
  const fieldStyle = {
    backgroundColor: withAlpha(controller.palette.darkMuted, 0.22),
    borderColor: withAlpha(controller.readableForeground.subtitleColor, 0.18),
    color: controller.readableForeground.titleColor,
    boxShadow: `inset 0 1px 0 ${withAlpha(controller.readableForeground.titleColor, 0.08)}`,
  } as const;
  const primaryActionStyle = {
    ...controller.activeTransportStyle,
    ...controller.readableForeground.titleStyle,
  } as const;
  const secondaryActionStyle = {
    ...controller.subtleControlStyle,
    ...controller.readableForeground.titleStyle,
  } as const;
  const browsedItems = flattenPlayableItems(browseResult ?? undefined);
  const searchedItems = flattenPlayableItems(searchResult ?? undefined);

  return (
    <div
      className={`space-y-4 rounded-2xl border p-4 ${controller.surface.border} ${
        controller.isGlass ? 'bg-white/8' : 'bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-sm font-semibold ${controller.surface.textPrimary}`}
          style={controller.readableForeground.titleStyle}
        >
          {t('media.capabilities.title')}
        </span>
        {capabilities.canClearPlaylist && supportsMediaControls ? (
          <Button
            size="compact"
            variant="soft"
            onClick={onClearPlaylist}
            leading={<Trash2 className="h-3.5 w-3.5" />}
            style={secondaryActionStyle}
          >
            {t('media.clearPlaylist')}
          </Button>
        ) : null}
      </div>

      {capabilities.canSeek && durationSeconds > 0 && supportsMediaControls ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`text-xs font-medium ${controller.surface.textSecondary}`}
              style={controller.readableForeground.subtitleStyle}
            >
              {t('media.seek')}
            </span>
            <span
              className={`text-xs ${controller.surface.textMuted}`}
              style={controller.readableForeground.subtitleStyle}
            >
              {Math.round(pendingSeek)}s
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(durationSeconds, elapsedSeconds)}
            value={pendingSeek}
            onChange={(event) => setPendingSeek(Number(event.target.value))}
            onMouseUp={() => onSeek(pendingSeek)}
            onTouchEnd={() => onSeek(pendingSeek)}
            className="w-full accent-white"
          />
        </div>
      ) : null}

      {capabilities.canSelectSource && sourceList.length > 0 && supportsMediaControls ? (
        <Select
          size="small"
          value={source ?? sourceList[0]}
          onChange={(event) => onSelectSource(event.target.value)}
          aria-label={t('media.source')}
          style={fieldStyle}
          selectClassName="placeholder:opacity-70"
          indicatorClassName={controller.surface.textSecondary}
          containerClassName="w-full"
          accentColorOverride={controller.palette.highlight}
        >
          {sourceList.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
      ) : null}

      {capabilities.canSelectSoundMode && soundModeList.length > 0 && supportsMediaControls ? (
        <Select
          size="small"
          value={soundMode ?? soundModeList[0]}
          onChange={(event) => onSelectSoundMode(event.target.value)}
          aria-label={t('media.soundMode')}
          style={fieldStyle}
          selectClassName="placeholder:opacity-70"
          indicatorClassName={controller.surface.textSecondary}
          containerClassName="w-full"
          accentColorOverride={controller.palette.highlight}
        >
          {soundModeList.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
      ) : null}

      {capabilities.canPlayMedia && supportsMediaControls ? (
        <div className="space-y-2">
          <div className="flex min-w-0 gap-2">
            <Input
              type="text"
              size="small"
              value={mediaContentId}
              onChange={(event) => setMediaContentId(event.target.value)}
              placeholder={t('media.playMedia.placeholder')}
              aria-label={t('media.playMedia.content')}
              style={fieldStyle}
              inputClassName="placeholder:opacity-70"
              variant="soft"
            />
            <Input
              type="text"
              size="small"
              value={mediaContentType}
              onChange={(event) => setMediaContentType(event.target.value)}
              aria-label={t('media.playMedia.type')}
              containerClassName="w-28 shrink-0"
              style={fieldStyle}
              inputClassName="placeholder:opacity-70"
              variant="soft"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {capabilities.canEnqueue ? (
              <Select
                size="small"
                value={enqueue}
                onChange={(event) => setEnqueue(event.target.value as EnqueueMode)}
                aria-label={t('media.enqueue')}
                containerClassName="min-w-32"
                style={fieldStyle}
                accentColorOverride={controller.palette.highlight}
                indicatorClassName={controller.surface.textSecondary}
              >
                <option value="play">{t('media.enqueue.play')}</option>
                <option value="next">{t('media.enqueue.next')}</option>
                <option value="add">{t('media.enqueue.add')}</option>
                <option value="replace">{t('media.enqueue.replace')}</option>
              </Select>
            ) : null}
            {capabilities.canAnnounce ? (
              <label
                htmlFor={announceCheckboxId}
                className={`flex items-center gap-2 text-sm ${controller.surface.textPrimary}`}
                style={controller.readableForeground.titleStyle}
              >
                <Checkbox
                  id={announceCheckboxId}
                  checked={announce}
                  onCheckedChange={(value) => setAnnounce(value === true)}
                />
                {t('media.announce')}
              </label>
            ) : null}
            <Button
              size="small"
              variant="soft"
              onClick={() => playMedia(mediaContentId, mediaContentType)}
              style={primaryActionStyle}
            >
              {t('media.playMedia.action')}
            </Button>
          </div>
        </div>
      ) : null}

      {capabilities.canBrowseMedia && supportsMediaBrowse ? (
        <div className="space-y-2">
          <Button
            size="small"
            variant="secondary"
            onClick={() => browseMedia()}
            leading={<ListMusic className="h-4 w-4" />}
            style={secondaryActionStyle}
          >
            {t('media.browse')}
          </Button>
          {browsedItems.length > 0 ? (
            <div className="space-y-1.5">
              {browsedItems.slice(0, 6).map((item) => (
                <button
                  key={`${item.mediaContentType}:${item.mediaContentId}`}
                  type="button"
                  className={itemButtonClassName}
                  style={controller.readableForeground.titleStyle}
                  onClick={() =>
                    item.canExpand && !item.canPlay
                      ? browseMedia(item)
                      : playMedia(item.mediaContentId ?? '', item.mediaContentType)
                  }
                >
                  {item.title ?? item.mediaContentId}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {capabilities.canSearchMedia && supportsMediaBrowse ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              size="small"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('media.search.placeholder')}
              aria-label={t('media.search')}
              style={fieldStyle}
              inputClassName="placeholder:opacity-70"
              variant="soft"
            />
            <Button
              size="small"
              variant="secondary"
              onClick={searchMedia}
              leading={<Search className="h-4 w-4" />}
              style={secondaryActionStyle}
            >
              {t('media.search')}
            </Button>
          </div>
          {searchedItems.length > 0 ? (
            <div className="space-y-1.5">
              {searchedItems.slice(0, 6).map((item) => (
                <button
                  key={`${item.mediaContentType}:${item.mediaContentId}`}
                  type="button"
                  className={itemButtonClassName}
                  style={controller.readableForeground.titleStyle}
                  onClick={() => playMedia(item.mediaContentId ?? '', item.mediaContentType)}
                >
                  {item.title ?? item.mediaContentId}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
