import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useState } from 'react';
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

interface PhotoFrameWidgetProps {
  size?: CardSize;
  photoUrls?: string[];
  onUpdateUrls?: (urls: string[]) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  isEditMode?: boolean;
}

export function PhotoFrameWidget({
  size = 'large',
  photoUrls,
  onUpdateUrls,
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

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photoCount);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photoCount) % photoCount);
  };

  const safeIndex = Math.min(currentIndex, photoCount - 1);
  const currentPhoto = hasCustomPhotos ? null : mockPhotos[safeIndex];

  return (
    <div
      className={`${surface.panelClassName} relative flex h-full flex-col`}
      style={surface.panelStyle}
    >
      {surface.glowStyle ? <div className="absolute inset-0" style={surface.glowStyle} /> : null}
      {surface.overlayClassName ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
      ) : null}

      <div className="relative z-[2] flex h-full flex-col">
        {onUpdateUrls && (isEditMode || !hasCustomPhotos) && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`absolute right-4 top-4 z-10 shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-70 ${surface.textMuted}`}
            aria-label={t('widgets.photoFrame.settings.title')}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

        <div className="relative flex-1 overflow-hidden rounded-xl group">
          {hasCustomPhotos ? (
            <img
              src={photoUrls[safeIndex]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 ${currentPhoto?.backgroundClassName ?? ''}`} />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_38%,rgba(15,23,42,0.28)_100%)]" />
          {/* Navigation Buttons */}
          {!isCompact && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('carousel.previousSlide')}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('carousel.nextSlide')}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Dots */}
        {!isCompact && photoCount > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: photoCount }).map((_, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor:
                    index === safeIndex
                      ? getThemeColorValue(primaryColor)
                      : theme === 'light'
                        ? '#d1d5db'
                        : 'rgba(255, 255, 255, 0.3)',
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
            tintColor={tintColor}
            onTintColorChange={onTintColorChange}
          />
        )}
      </div>
    </div>
  );
}
