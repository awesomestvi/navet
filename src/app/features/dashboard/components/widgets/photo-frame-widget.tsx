import { ChevronLeft, ChevronRight, MoreHorizontal, Settings2, Shuffle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BaseCard, RoundControlButton } from '@/app/components/primitives';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import {
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard/stores/custom-cards-store';
import { useDevices, useI18n, useRooms, useTheme } from '@/app/hooks';
import { useAuth } from '@/app/stores/auth-store';
import { authSelectors } from '@/app/stores/selectors';
import { PhotoFrameSettingsDialog } from './photo-frame-settings-dialog';
import { type PhotoFrameSourceMode, resolvePhotoFrameSourceMode } from './photo-frame-types';
import { usePhotoFrameSources } from './use-photo-frame-sources';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

const mockPhotos = [
  {
    backgroundClassName:
      'bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.95),_transparent_42%),radial-gradient(circle_at_70%_30%,_rgba(245,158,11,0.75),_transparent_34%),linear-gradient(135deg,_#5b2a12_0%,_#1f2937_100%)]',
  },
  {
    backgroundClassName:
      'bg-[radial-gradient(circle_at_20%_20%,_rgba(34,211,238,0.92),_transparent_38%),radial-gradient(circle_at_75%_25%,_rgba(59,130,246,0.8),_transparent_32%),linear-gradient(135deg,_#0f172a_0%,_#1e3a8a_100%)]',
  },
  {
    backgroundClassName:
      'bg-[radial-gradient(circle_at_18%_78%,_rgba(236,72,153,0.72),_transparent_36%),radial-gradient(circle_at_82%_20%,_rgba(168,85,247,0.74),_transparent_30%),linear-gradient(135deg,_#111827_0%,_#312e81_100%)]',
  },
  {
    backgroundClassName:
      'bg-[radial-gradient(circle_at_25%_28%,_rgba(74,222,128,0.84),_transparent_36%),radial-gradient(circle_at_80%_22%,_rgba(250,204,21,0.56),_transparent_26%),linear-gradient(135deg,_#052e16_0%,_#365314_100%)]',
  },
  {
    backgroundClassName:
      'bg-[radial-gradient(circle_at_18%_18%,_rgba(45,212,191,0.86),_transparent_34%),radial-gradient(circle_at_78%_26%,_rgba(253,224,71,0.62),_transparent_28%),linear-gradient(135deg,_#164e63_0%,_#155e75_52%,_#78350f_100%)]',
  },
] as const satisfies ReadonlyArray<{
  backgroundClassName: string;
}>;

const PHOTO_SHUFFLE_INTERVAL_MS = 8000;

interface PhotoFrameWidgetProps {
  size?: CardSize;
  room?: string;
  onRoomChange?: (room: string) => void;
  sourceMode?: PhotoFrameSourceMode;
  photoUrls?: string[];
  mediaSourceId?: string;
  shuffleEnabled?: boolean;
  onUpdateUrls?: (urls: string[]) => void;
  onSourceModeChange?: (mode: PhotoFrameSourceMode) => void;
  onMediaSourceIdChange?: (mediaSourceId: string) => void;
  onShuffleEnabledChange?: (enabled: boolean) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  isEditMode?: boolean;
}

export function PhotoFrameWidget({
  size = 'large',
  room,
  onRoomChange,
  sourceMode,
  photoUrls,
  mediaSourceId,
  shuffleEnabled = true,
  onUpdateUrls,
  onSourceModeChange,
  onMediaSourceIdChange,
  onShuffleEnabledChange,
  tintColor,
  onTintColorChange,
  isEditMode: _isEditMode = false,
}: PhotoFrameWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const devices = useDevices();
  const rooms = useRooms(devices);
  const authConfig = useAuth(authSelectors.config);
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const roomValue = room === 'All' || !room ? HOME_WIDGET_ROOM : room;
  const roomLabel = roomValue === HOME_WIDGET_ROOM ? t('dashboard.roomNav.all') : roomValue;
  const roomOptions = [
    { label: t('dashboard.roomNav.all'), value: HOME_WIDGET_ROOM },
    ...rooms.map((entry) => ({ label: entry, value: entry })),
  ];
  const isCompact = isCompactCardSize(size);
  const resolvedSourceMode = resolvePhotoFrameSourceMode(sourceMode, mediaSourceId);
  const { activePhotoUrls, hasCustomPhotos } = usePhotoFrameSources({
    sourceMode: resolvedSourceMode,
    photoUrls,
    mediaSourceId,
    hassUrl: authConfig?.url,
  });

  const photoCount = hasCustomPhotos ? activePhotoUrls.length : mockPhotos.length;
  const safeIndex = Math.min(currentIndex, Math.max(0, photoCount - 1));
  const currentPhoto = hasCustomPhotos ? null : mockPhotos[safeIndex];
  const currentPhotoUrl = activePhotoUrls[safeIndex];
  const showShuffleControl = photoCount > 1 && !isCompact;
  const photoFrameConfig = useMemo(
    () =>
      onUpdateUrls && onSourceModeChange && onMediaSourceIdChange
        ? {
            onUpdateUrls,
            onSourceModeChange,
            onMediaSourceIdChange,
          }
        : null,
    [onMediaSourceIdChange, onSourceModeChange, onUpdateUrls]
  );
  const canConfigure = photoFrameConfig !== null;
  const hasMenuActions = showShuffleControl || canConfigure;
  const chromeSize = size === 'large' ? 'medium' : size;
  const controlAccentColor = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const dropdownItemClassName = cn(
    'rounded-xl border border-transparent px-3 py-2 text-sm outline-none transition-colors',
    'data-[highlighted]:bg-[var(--menu-hover-bg)] data-[highlighted]:border-[var(--menu-hover-border)]',
    'focus:bg-[var(--menu-hover-bg)] focus:border-[var(--menu-hover-border)]'
  );
  const dropdownItemHoverStyle = {
    '--menu-hover-bg':
      theme === 'light'
        ? withTintAlpha(controlAccentColor, 0.12)
        : theme === 'glass'
          ? withTintAlpha(controlAccentColor, 0.16)
          : withTintAlpha(controlAccentColor, 0.2),
    '--menu-hover-border':
      theme === 'light'
        ? withTintAlpha(controlAccentColor, 0.24)
        : theme === 'glass'
          ? withTintAlpha(controlAccentColor, 0.32)
          : withTintAlpha(controlAccentColor, 0.38),
  } as CSSProperties;
  const imageMotionClassName = useMemo(
    () => (hasCustomPhotos ? 'scale-[1.02] transition-transform duration-[1800ms] ease-out' : ''),
    [hasCustomPhotos]
  );

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photoCount);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photoCount) % photoCount);
  };

  const jumpToRandomPhoto = useCallback(() => {
    if (photoCount <= 1) {
      return;
    }

    setCurrentIndex((prev) => {
      const nextIndex = Math.floor(Math.random() * (photoCount - 1));
      return nextIndex >= prev ? nextIndex + 1 : nextIndex;
    });
  }, [photoCount]);

  useEffect(() => {
    if (!shuffleEnabled || photoCount <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      jumpToRandomPhoto();
    }, PHOTO_SHUFFLE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [jumpToRandomPhoto, photoCount, shuffleEnabled]);

  useEffect(() => {
    if (currentIndex > photoCount - 1) {
      setCurrentIndex(0);
    }
  }, [currentIndex, photoCount]);

  return (
    <BaseCard
      size={size}
      fullBleed
      style={{
        ...surface.panelStyle,
        background: 'transparent',
        boxShadow: 'none',
      }}
      frameClassName="overflow-hidden"
      disableDefaultSheen
      contentClassName="h-full"
    >
      <div className="relative z-[2] flex h-full flex-col">
        {hasMenuActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <RoundControlButton
                theme={theme}
                size={chromeSize === 'small' ? 'small' : 'medium'}
                variant="soft"
                aria-label={t('widgets.photoFrame.settings.title')}
                className="absolute right-3 top-3 z-20 shrink-0"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </RoundControlButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(getThemeDropdownSurfaceClasses(theme), 'min-w-40 rounded-2xl p-2')}
              onClick={(event) => event.stopPropagation()}
            >
              {showShuffleControl ? (
                <DropdownMenuItem
                  className={dropdownItemClassName}
                  style={dropdownItemHoverStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    jumpToRandomPhoto();
                  }}
                >
                  <Shuffle className="h-4 w-4" />
                  {t('widgets.photoFrame.shuffle')}
                </DropdownMenuItem>
              ) : null}
              {canConfigure ? (
                <DropdownMenuItem
                  className={dropdownItemClassName}
                  style={dropdownItemHoverStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings2 className="h-4 w-4" />
                  {t('widgets.photoFrame.settings.title')}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <div className="relative flex-1 overflow-hidden rounded-[28px] group">
          {hasCustomPhotos ? (
            <img
              src={currentPhotoUrl}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover ${imageMotionClassName}`}
            />
          ) : (
            <div className={`absolute inset-0 ${currentPhoto?.backgroundClassName ?? ''}`} />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_22%,rgba(0,0,0,0.12)_66%,rgba(2,6,23,0.44)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

          {/* Navigation Buttons */}
          {!isCompact && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/28 text-white/90 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                aria-label={t('carousel.previousSlide')}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/28 text-white/90 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                aria-label={t('carousel.nextSlide')}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Dots */}
        {!isCompact && photoCount > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center gap-3">
            {Array.from({ length: photoCount }).map((_, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="pointer-events-auto h-2 w-2 rounded-full transition-all"
                style={{
                  backgroundColor:
                    index === safeIndex
                      ? getThemeColorValue(primaryColor)
                      : 'rgba(255, 255, 255, 0.45)',
                }}
              />
            ))}
          </div>
        )}

        {canConfigure ? (
          <PhotoFrameSettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            roomValue={roomValue}
            roomLabel={roomLabel}
            roomOptions={roomOptions}
            onRoomChange={onRoomChange}
            sourceMode={resolvedSourceMode}
            onSourceModeChange={photoFrameConfig.onSourceModeChange}
            photoUrls={photoUrls ?? []}
            onUpdateUrls={photoFrameConfig.onUpdateUrls}
            mediaSourceId={mediaSourceId}
            onMediaSourceIdChange={photoFrameConfig.onMediaSourceIdChange}
            shuffleEnabled={shuffleEnabled}
            onShuffleEnabledChange={onShuffleEnabledChange}
            tintColor={tintColor}
            onTintColorChange={onTintColorChange}
          />
        ) : null}
      </div>
    </BaseCard>
  );
}
