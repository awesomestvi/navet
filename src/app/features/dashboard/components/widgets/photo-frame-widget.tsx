import { ChevronLeft, ChevronRight, Settings2, Shuffle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { PhotoFrameSettingsDialog } from './photo-frame-settings-dialog';
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
  photoUrls?: string[];
  shuffleEnabled?: boolean;
  onUpdateUrls?: (urls: string[]) => void;
  onShuffleEnabledChange?: (enabled: boolean) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  isEditMode?: boolean;
}

export function PhotoFrameWidget({
  size = 'large',
  photoUrls,
  shuffleEnabled = true,
  onUpdateUrls,
  onShuffleEnabledChange,
  tintColor,
  onTintColorChange,
  isEditMode = false,
}: PhotoFrameWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isCompact = isCompactCardSize(size);
  const hasCustomPhotos = photoUrls && photoUrls.length > 0;

  const photoCount = hasCustomPhotos ? photoUrls.length : mockPhotos.length;
  const activePhotoUrls = hasCustomPhotos ? photoUrls : [];
  const safeIndex = Math.min(currentIndex, Math.max(0, photoCount - 1));
  const currentPhoto = hasCustomPhotos ? null : mockPhotos[safeIndex];
  const currentPhotoUrl = activePhotoUrls[safeIndex];
  const showShuffleControl = photoCount > 1 && !isCompact;
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
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10"
      style={{
        ...surface.panelStyle,
        background: 'transparent',
        borderColor: 'transparent',
        boxShadow: 'none',
      }}
    >
      <div className="relative z-[2] flex h-full flex-col">
        {onUpdateUrls && (isEditMode || !hasCustomPhotos) && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`absolute right-4 top-4 z-20 shrink-0 rounded-full border border-white/14 bg-black/28 p-2 text-white/80 backdrop-blur-md transition-opacity hover:opacity-90 ${surface.textMuted}`}
            aria-label={t('widgets.photoFrame.settings.title')}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

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

          {showShuffleControl ? (
            <button
              type="button"
              onClick={jumpToRandomPhoto}
              className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/26 px-3 py-1.5 text-[11px] font-medium text-white/88 backdrop-blur-md transition-opacity hover:opacity-95"
            >
              <Shuffle className="h-3.5 w-3.5" />
              {t('widgets.photoFrame.shuffle')}
            </button>
          ) : null}

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
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
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

        {onUpdateUrls && (
          <PhotoFrameSettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            photoUrls={photoUrls ?? []}
            onUpdateUrls={onUpdateUrls}
            shuffleEnabled={shuffleEnabled}
            onShuffleEnabledChange={onShuffleEnabledChange}
            tintColor={tintColor}
            onTintColorChange={onTintColorChange}
          />
        )}
      </div>
    </div>
  );
}
