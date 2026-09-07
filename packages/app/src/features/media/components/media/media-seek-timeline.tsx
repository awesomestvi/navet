import { Slider } from '@navet/app/components/primitives/slider';
import { useI18n } from '@navet/app/hooks';
import { type CSSProperties, useEffect, useState } from 'react';
import { formatMediaTime } from './media-time';

interface MediaSeekTimelineProps {
  elapsedSeconds: number;
  durationSeconds: number;
  canSeek: boolean;
  onSeek: (elapsedSeconds: number) => void;
  className: string;
  labelClassName: string;
  labelStyle: CSSProperties;
  rootClassName: string;
  thumbClassName: string;
  trackStyle: CSSProperties;
  rangeStyle: CSSProperties;
  thumbStyle: CSSProperties;
}

/** Shared seek interaction; each card layout supplies its existing visual recipe. */
export function MediaSeekTimeline({
  elapsedSeconds,
  durationSeconds,
  canSeek,
  onSeek,
  className,
  labelClassName,
  labelStyle,
  rootClassName,
  thumbClassName,
  trackStyle,
  rangeStyle,
  thumbStyle,
}: MediaSeekTimelineProps) {
  const { t } = useI18n();
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const hasSeekDuration = durationSeconds > 0;
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const [isSeeking, setIsSeeking] = useState(false);
  useEffect(() => {
    if (!isSeeking) setPendingSeek(elapsedSeconds);
  }, [elapsedSeconds, isSeeking]);
  return (
    <div className={className}>
      <span className={labelClassName} style={labelStyle}>
        {formatMediaTime(hasSeekDuration ? Math.max(0, pendingSeek) : 0)}
      </span>
      <Slider
        value={hasSeekDuration ? Math.min(durationSeconds, pendingSeek) : 0}
        min={0}
        max={hasSeekDuration ? Math.max(durationSeconds, elapsedSeconds, pendingSeek) : 1}
        step={1}
        ariaLabel={t('media.seek')}
        onValueChange={(value) => {
          if (hasSeekDuration && canSeek) {
            setPendingSeek(value);
          }
        }}
        onValueCommit={(value) => {
          if (hasSeekDuration && canSeek) {
            onSeek(value);
          }
        }}
        onInteractionStart={() => {
          if (hasSeekDuration && canSeek) {
            setIsSeeking(true);
          }
        }}
        onInteractionEnd={() => {
          if (hasSeekDuration) {
            setIsSeeking(false);
          }
        }}
        disabled={!hasSeekDuration || !canSeek}
        rootClassName={rootClassName}
        trackClassName="relative h-[3px] grow rounded-full"
        rangeClassName="absolute h-full rounded-full"
        thumbClassName={thumbClassName}
        touchThumbClassName="block h-6 w-6 rounded-full outline-none"
        trackStyle={trackStyle}
        rangeStyle={rangeStyle}
        thumbStyle={thumbStyle}
      />
      <span className={labelClassName} style={labelStyle}>
        {hasSeekDuration ? durationLabel : formatMediaTime(0)}
      </span>
    </div>
  );
}
